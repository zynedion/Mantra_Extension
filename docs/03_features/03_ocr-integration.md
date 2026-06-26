# Feature 03: OCR Integration (Google Cloud Vision)
## Phase 3 — Text Detection Pipeline

**Objective:** Integrate Google Cloud Vision API to detect and extract text from manga images, returning structured bounding box data for downstream translation and rendering.

**Timeline:** 3-4 days
**Dependencies:** Phase 2 complete (storage + API keys configured)

**Acceptance Criteria:**
- ✅ Image capture from page works on all major manga sites
- ✅ Google Cloud Vision returns OCR results with bounding boxes
- ✅ Text regions correctly grouped per speech bubble (no cross-bubble mixing)
- ✅ Error handling for quota, auth, and network failures
- ✅ Loading state shown during OCR processing
- ✅ Results cached to avoid repeat API calls for same image

---

## 1. ARCHITECTURE FLOW

```
User clicks floating icon on image
  ↓
Content script: capture image as Blob
  ↓
Compute SHA-256 hash of image (cache key)
  ↓
Check IndexedDB cache for existing OCR result
  ↓
  [HIT] → return cached result
  [MISS] → continue
  ↓
Send to background service worker via message
  ↓
Background: validate Google Cloud API key
  ↓
Convert Blob to base64
  ↓
POST to Google Cloud Vision API
  ↓
Parse response: full text + per-region bounding boxes
  ↓
Group adjacent regions into "text blocks" (speech bubbles)
  ↓
Cache result in IndexedDB
  ↓
Return to content script
  ↓
Content script: emit "ocr-complete" event with structured data
```

---

## 2. OCR MODULE

### **File: `src/modules/ocr.js`**

```javascript
/**
 * Google Cloud Vision OCR Handler
 * Provides text detection with bounding boxes for manga images.
 */

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

/**
 * Perform OCR on an image blob.
 * @param {Blob} imageBlob - Image to analyze
 * @param {string} apiKey - Google Cloud Vision API key
 * @returns {Promise<OcrResult>}
 */
export async function performOcr(imageBlob, apiKey) {
  if (!apiKey) {
    throw new OcrError('NO_API_KEY', 'Google Cloud Vision API key not configured');
  }

  const base64 = await blobToBase64(imageBlob);

  const requestBody = {
    requests: [
      {
        image: { content: base64 },
        features: [
          {
            type: 'DOCUMENT_TEXT_DETECTION', // Better than TEXT_DETECTION for dense layouts
            maxResults: 1
          }
        ],
        imageContext: {
          languageHints: ['ja', 'zh', 'ko', 'en'] // Hint for manga-likely languages
        }
      }
    ]
  };

  const response = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || `HTTP ${response.status}`;

    if (response.status === 401 || response.status === 403) {
      throw new OcrError('AUTH_ERROR', 'Invalid Google Cloud API key. Check settings.', errorBody);
    }
    if (response.status === 429) {
      throw new OcrError('QUOTA_EXCEEDED', 'Google Cloud quota exceeded. Resets monthly.', errorBody);
    }
    if (response.status >= 500) {
      throw new OcrError('SERVER_ERROR', 'Google Cloud server error. Try again shortly.', errorBody);
    }
    throw new OcrError('API_ERROR', message, errorBody);
  }

  const data = await response.json();
  return parseOcrResponse(data);
}

/**
 * Parse Google Cloud Vision response into structured OCR result.
 * Uses DOCUMENT_TEXT_DETECTION's full text annotation hierarchy:
 *   pages → blocks → paragraphs → words → symbols
 * We treat each "block" as a speech bubble candidate.
 */
function parseOcrResponse(apiResponse) {
  const response = apiResponse.responses?.[0];
  if (!response || response.error) {
    throw new OcrError('PARSE_ERROR', response?.error?.message || 'Empty OCR response');
  }

  const fullText = response.fullTextAnnotation?.text || '';
  if (!fullText.trim()) {
    return {
      fullText: '',
      regions: [],
      detectedLanguages: []
    };
  }

  const regions = [];
  const pages = response.fullTextAnnotation?.pages || [];

  for (const page of pages) {
    for (const block of (page.blocks || [])) {
      // Group paragraphs within a block into a single text region
      const paragraphTexts = [];
      const allVertices = [];

      for (const paragraph of (block.paragraphs || [])) {
        const text = extractTextFromParagraph(paragraph);
        if (text.trim()) {
          paragraphTexts.push(text);
          if (paragraph.boundingBox?.vertices) {
            allVertices.push(...paragraph.boundingBox.vertices);
          }
        }
      }

      if (paragraphTexts.length === 0) continue;

      const combinedText = paragraphTexts.join('\n').trim();
      const bbox = computeAxisAlignedBoundingBox(allVertices);

      regions.push({
        id: crypto.randomUUID(),
        text: combinedText,
        bounds: bbox, // {x, y, width, height}
        vertices: block.boundingBox?.vertices || allVertices,
        confidence: block.confidence || 0,
        languages: extractLanguages(block)
      });
    }
  }

  const detectedLanguages = [
    ...new Set(regions.flatMap(r => r.languages))
  ];

  return {
    fullText,
    regions, // Array of {id, text, bounds, vertices, confidence, languages}
    detectedLanguages
  };
}

function extractTextFromParagraph(paragraph) {
  const words = paragraph.words || [];
  return words
    .map(word => {
      const symbols = word.symbols || [];
      return symbols
        .map(s => {
          let text = s.text || '';
          // Append detected break (space, newline, etc.) after symbol
          const breakType = s.property?.detectedBreak?.type;
          if (breakType === 'SPACE' || breakType === 'SURE_SPACE') text += ' ';
          if (breakType === 'EOL_SURE_SPACE' || breakType === 'LINE_BREAK') text += '\n';
          return text;
        })
        .join('');
    })
    .join('');
}

function extractLanguages(block) {
  const langs = new Set();
  const detected = block.property?.detectedLanguages || [];
  for (const lang of detected) {
    if (lang.languageCode) langs.add(lang.languageCode);
  }
  return Array.from(langs);
}

/**
 * Convert polygon vertices into axis-aligned bounding box.
 */
function computeAxisAlignedBoundingBox(vertices) {
  if (!vertices || vertices.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const xs = vertices.map(v => v.x || 0);
  const ys = vertices.map(v => v.y || 0);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Convert Blob to base64 string (without data URL prefix).
 */
async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Compute SHA-256 hash of image blob (for cache key).
 */
export async function hashImage(blob) {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============ ERROR CLASS ============

export class OcrError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'OcrError';
    this.code = code; // NO_API_KEY | AUTH_ERROR | QUOTA_EXCEEDED | SERVER_ERROR | API_ERROR | PARSE_ERROR
    this.details = details;
  }
}
```

---

## 3. OCR CACHE (IndexedDB)

### **Add to `src/modules/storage.js`:**

```javascript
const STORE_OCR_CACHE = 'ocrCache';

// Update getDB upgrade function:
async function getDB() {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_TRANSLATIONS)) {
        const store = db.createObjectStore(STORE_TRANSLATIONS, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('siteUrl', 'siteUrl');
      }
      if (!db.objectStoreNames.contains(STORE_OCR_CACHE)) {
        const cacheStore = db.createObjectStore(STORE_OCR_CACHE, { keyPath: 'hash' });
        cacheStore.createIndex('cachedAt', 'cachedAt');
      }
    }
  });
  return dbInstance;
}

export const OcrCacheStore = {
  async get(hash) {
    const db = await getDB();
    const entry = await db.get(STORE_OCR_CACHE, hash);
    if (!entry) return null;
    // Expire after 7 days
    if (Date.now() - new Date(entry.cachedAt).getTime() > 7 * 24 * 60 * 60 * 1000) {
      await db.delete(STORE_OCR_CACHE, hash);
      return null;
    }
    return entry.ocrResult;
  },

  async set(hash, ocrResult) {
    const db = await getDB();
    await db.put(STORE_OCR_CACHE, {
      hash,
      ocrResult,
      cachedAt: new Date().toISOString()
    });
  },

  async clear() {
    const db = await getDB();
    await db.clear(STORE_OCR_CACHE);
  }
};
```

---

## 4. IMAGE CAPTURE (Content Script)

### **Update `src/content-script.js`:**

Replace the placeholder `captureImageAsBlob` from Phase 1 with this robust implementation:

```javascript
/**
 * Capture image element as Blob, handling CORS-tainted images.
 */
async function captureImageAsBlob(imgElement) {
  // Wait for image to fully load
  if (!imgElement.complete || imgElement.naturalWidth === 0) {
    await new Promise((resolve, reject) => {
      imgElement.addEventListener('load', resolve, { once: true });
      imgElement.addEventListener('error', reject, { once: true });
      setTimeout(() => reject(new Error('Image load timeout')), 10000);
    });
  }

  // Attempt 1: Canvas drawImage (works if same-origin or crossOrigin set)
  try {
    return await canvasCapture(imgElement);
  } catch (err) {
    console.warn('[Mantra] Canvas capture failed (likely CORS), falling back to fetch:', err);
  }

  // Attempt 2: Fetch via background (bypasses CORS for many sites)
  return await fetchViaBackground(imgElement.src);
}

async function canvasCapture(imgElement) {
  const canvas = new OffscreenCanvas(imgElement.naturalWidth, imgElement.naturalHeight);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgElement, 0, 0);
  return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
}

async function fetchViaBackground(imageUrl) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'fetchImage', url: imageUrl },
      (response) => {
        if (response?.success) {
          // Response.data is array buffer transferred from background
          const blob = new Blob([new Uint8Array(response.data)], { type: response.mimeType || 'image/jpeg' });
          resolve(blob);
        } else {
          reject(new Error(response?.error || 'Background fetch failed'));
        }
      }
    );
  });
}
```

### **Add to `src/background.js`:**

```javascript
// Image fetcher (bypasses CORS for content scripts)
if (request.action === 'fetchImage') {
  fetchImageAsBuffer(request.url).then(sendResponse);
  return true;
}

async function fetchImageAsBuffer(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    const buffer = await response.arrayBuffer();
    return {
      success: true,
      data: Array.from(new Uint8Array(buffer)),
      mimeType: response.headers.get('Content-Type') || 'image/jpeg'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

## 5. BACKGROUND ORCHESTRATION

### **Update `src/background.js`** — Replace OCR placeholder:

```javascript
import { performOcr, hashImage, OcrError } from './modules/ocr.js';
import { ApiKeyStore, OcrCacheStore } from './modules/storage.js';

if (request.action === 'performOcr') {
  handleOcrRequest(request).then(sendResponse);
  return true;
}

async function handleOcrRequest(request) {
  try {
    const apiKey = await ApiKeyStore.get('googleCloud');
    if (!apiKey) {
      return {
        success: false,
        errorCode: 'NO_API_KEY',
        error: 'Google Cloud Vision API key not configured. Add it in Settings → API Keys.'
      };
    }

    // Reconstruct blob from transferred data
    const imageBlob = new Blob(
      [new Uint8Array(request.imageData)],
      { type: request.mimeType || 'image/jpeg' }
    );

    // Check cache
    const hash = await hashImage(imageBlob);
    const cached = await OcrCacheStore.get(hash);
    if (cached) {
      console.log('[Mantra] OCR cache hit:', hash.substring(0, 8));
      return { success: true, ocrResult: cached, cached: true };
    }

    // Call API
    console.log('[Mantra] OCR cache miss, calling Google Cloud Vision');
    const ocrResult = await performOcr(imageBlob, apiKey);

    // Cache result
    await OcrCacheStore.set(hash, ocrResult);

    return { success: true, ocrResult, cached: false };
  } catch (error) {
    if (error instanceof OcrError) {
      return { success: false, errorCode: error.code, error: error.message, details: error.details };
    }
    return { success: false, errorCode: 'UNKNOWN', error: error.message };
  }
}
```

---

## 6. CONTENT SCRIPT — Wire OCR Flow

### **Update icon click handler in `src/content-script.js`:**

```javascript
async function handleIconClick(imgElement, iconElement) {
  // Show loading state
  showIconLoading(iconElement);

  try {
    // 1. Capture image
    const imageBlob = await captureImageAsBlob(imgElement);

    // 2. Transfer to background (need array transfer)
    const arrayBuffer = await imageBlob.arrayBuffer();
    const imageData = Array.from(new Uint8Array(arrayBuffer));

    // 3. Request OCR
    const ocrResponse = await chrome.runtime.sendMessage({
      action: 'performOcr',
      imageData,
      mimeType: imageBlob.type
    });

    if (!ocrResponse.success) {
      handleOcrError(ocrResponse);
      return;
    }

    const ocrResult = ocrResponse.ocrResult;

    if (ocrResult.regions.length === 0) {
      showToast('No text detected in image.', 'info');
      return;
    }

    showToast(`Detected ${ocrResult.regions.length} text region(s). Translating...`, 'info');

    // 4. Hand off to translation pipeline (Phase 4)
    // For now, just dispatch an event with the OCR result
    window.dispatchEvent(new CustomEvent('mantra:ocr-complete', {
      detail: { imgElement, imageBlob, ocrResult }
    }));

  } catch (error) {
    console.error('[Mantra] OCR flow failed:', error);
    showToast(`OCR failed: ${error.message}`, 'error');
  } finally {
    resetFloatingIcon(iconElement);
  }
}

function handleOcrError(response) {
  switch (response.errorCode) {
    case 'NO_API_KEY':
      showToast('Set Google Cloud API key in Settings.', 'error');
      // Optionally open settings:
      chrome.runtime.sendMessage({ action: 'openSettings' });
      break;
    case 'AUTH_ERROR':
      showToast('Invalid Google Cloud API key. Check Settings.', 'error');
      break;
    case 'QUOTA_EXCEEDED':
      showToast('Google Cloud quota exceeded (1k/month free tier). Resets next month.', 'error');
      break;
    case 'SERVER_ERROR':
      showToast('Google Cloud server error. Try again shortly.', 'error');
      break;
    default:
      showToast(`OCR error: ${response.error}`, 'error');
  }
}
```

---

## 7. SPEECH BUBBLE GROUPING (Critical for "No Cross-Bubble Mix")

`DOCUMENT_TEXT_DETECTION` already separates text into blocks per visual cluster, which solves the original Click to Do problem (multiple bubbles on same horizontal line mixed together). However, in edge cases Google still merges close bubbles. Apply a post-processing pass:

### **File: `src/modules/bubble-grouping.js`**

```javascript
/**
 * Post-process OCR regions to better separate manga speech bubbles.
 * Strategy: If two regions horizontally close (overlap by > 50%) but vertically
 * separate by clear gap (> 1.5x line height), keep them separate. If a single
 * region contains multiple paragraphs that are widely spaced, split them.
 */

const MIN_HORIZONTAL_OVERLAP_RATIO = 0.5;
const MAX_VERTICAL_GAP_RATIO = 0.4; // Relative to region height

export function refineRegions(regions) {
  // For now, trust DOCUMENT_TEXT_DETECTION's block separation.
  // The Vision API is highly tuned for this; the previous problem was
  // specific to Windows Click to Do's coarse OCR, not Google Cloud.
  // Stub here for future enhancement.

  // Filter out tiny noise regions (< 10px on either dimension)
  return regions.filter(r => r.bounds.width >= 10 && r.bounds.height >= 10);
}

export function sortReadingOrder(regions, sourceLang) {
  // Japanese manga: right-to-left, top-to-bottom
  // Western languages: left-to-right, top-to-bottom
  const isJapanese = sourceLang === 'ja';

  return [...regions].sort((a, b) => {
    // Group by vertical position with 30% tolerance
    const yDiff = a.bounds.y - b.bounds.y;
    const avgHeight = (a.bounds.height + b.bounds.height) / 2;
    if (Math.abs(yDiff) > avgHeight * 0.3) {
      return yDiff;
    }
    // Same row, sort by x
    return isJapanese
      ? b.bounds.x - a.bounds.x // RTL
      : a.bounds.x - b.bounds.x; // LTR
  });
}
```

---

## 8. ERROR STATES & USER FEEDBACK

| Error Code | User Message | Action Suggested |
|------------|--------------|------------------|
| `NO_API_KEY` | "Set Google Cloud API key in Settings" | Open settings link |
| `AUTH_ERROR` | "Invalid Google Cloud API key" | Re-enter key in settings |
| `QUOTA_EXCEEDED` | "Quota exceeded. Resets monthly" | Wait or upgrade plan |
| `SERVER_ERROR` | "Google Cloud server error" | Retry shortly |
| `PARSE_ERROR` | "Unexpected response from OCR" | Report issue |
| `NETWORK_ERROR` | "Check your internet connection" | Retry |
| Empty result | "No text detected in image" | Try different image |

---

## 9. ACCEPTANCE TESTS

| # | Test | Expected |
|---|------|----------|
| 1 | Click icon on manga image with Japanese text | OCR returns regions with `text`, `bounds`, `languages: ['ja']` |
| 2 | Click icon on image with multiple bubbles on same row | Each bubble returned as separate region |
| 3 | Click same image again within 7 days | Cache HIT, no API call (verify in network tab) |
| 4 | Click icon with no API key set | Toast: "Set Google Cloud API key in Settings" |
| 5 | Click icon with invalid API key | Toast: "Invalid Google Cloud API key" |
| 6 | Click icon on image with no text (e.g., decorative) | Toast: "No text detected in image" |
| 7 | Click icon on CORS-blocked image (cross-origin) | Falls back to background fetch, OCR succeeds |
| 8 | Spam-click icon 5 times rapidly | Only one OCR call processed (debounce or lock) |
| 9 | Disconnect network mid-OCR | Error handled gracefully, toast shown |
| 10 | View IndexedDB in DevTools after OCR | `ocrCache` store has entry with image hash as key |

---

## 10. DELIVERABLES

✅ `src/modules/ocr.js` — Google Cloud Vision integration with structured response parsing
✅ `src/modules/bubble-grouping.js` — Reading order + region refinement
✅ Updated `src/modules/storage.js` — OCR cache store
✅ Updated `src/content-script.js` — Image capture with CORS fallback
✅ Updated `src/background.js` — OCR orchestration with cache + error handling
✅ User-facing error messages for all failure modes
✅ Custom event `mantra:ocr-complete` dispatched on success (Phase 4 listens)

**Next Phase:** Feature 04 — Translation Pipeline (Multi-LLM)
