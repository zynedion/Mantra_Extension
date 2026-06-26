# Mantra Extension - Technical Specifications

**Version:** 1.0  
**Date:** June 26, 2026  
**Platform:** Chrome Extension Manifest V3  

---

## 1. EXTENSION MANIFEST (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "Mantra - Manga Translator",
  "version": "1.0.0",
  "description": "Translate manga text in-place with AI-powered translation and perfect canvas positioning",
  "icons": {
    "16": "public/icons/icon-16.png",
    "48": "public/icons/icon-48.png",
    "128": "public/icons/icon-128.png"
  },
  "action": {
    "default_popup": "public/popup.html",
    "default_icon": "public/icons/icon-48.png",
    "default_title": "Mantra Translator"
  },
  "options_page": "public/options.html",
  "permissions": [
    "storage",
    "tabs",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "src/background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content-script.js"],
      "run_at": "document_start"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["public/icons/*", "src/fonts/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

## 2. ARCHITECTURE LAYERS

### **Layer 1: Content Script (content-script.js)**
Runs in page context, detects images and injects floating icon.

**Responsibilities:**
- Detect all `<img>` elements on page
- Inject floating "M" icon (top-left corner)
- Listen for user clicks on icon
- Send image to background for processing
- Receive canvas overlay data and render on page

**Key Functions:**
```javascript
// Initialize image detection
initImageDetection() {}

// Inject floating icon
injectFloatingIcon() {}

// Handle icon click
onIconClick(event) {}

// Render canvas overlay
renderCanvasOverlay(imageElement, canvasData) {}

// Listen for messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {})
```

### **Layer 2: Background Service Worker (background.js)**
Persistent service worker that handles API calls and heavy processing.

**Responsibilities:**
- Manage API key storage and retrieval
- Orchestrate OCR (Google Cloud Vision)
- Coordinate translation (LLM APIs)
- Manage IndexedDB operations
- Handle message routing from content script

**Key Functions:**
```javascript
// Message routing
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {})

// Storage helpers
async getApiKey(provider) {}
async saveApiKey(provider, key) {}

// OCR orchestration
async performOcr(imageData, ocrApiKey) {}

// Translation orchestration
async translateText(ocrText, targetLang, translationProvider, apiKey) {}

// History management
async saveToHistory(translationData) {}
```

### **Layer 3: Storage (storage.js)**
Abstraction layer for both chrome.storage and IndexedDB.

**Storage Structure:**

**chrome.storage.sync (Encrypted by Chrome):**
```javascript
{
  "settings": {
    "enabledOnAllPages": true,
    "targetLanguage": "id",
    "autoDetectLanguage": true,
    "autoSave": true,
    "autoDeleteAge": "1month", // "1day", "1week", "1month", "never"
    "fontSize": 16,
    "fontFamily": "WildWords",
    "fontColor": "#000000",
    "strokeColor": "#ffffff",
    "strokeSize": 2,
    "textAlignment": "center",
    "lineSpacing": 100,
    "letterSpacing": 0,
    "borderRadius": 8,
    "borderPadding": 4,
    "theme": "dark",
    "iconOpacity": 0.3
  },
  "apiKeys": {
    "googleCloud": {
      "key": "[ENCRYPTED BY CHROME]",
      "lastTested": "2026-06-26T10:00:00Z"
    },
    "translationProvider": "langbly", // "langbly", "openrouter", "gemini", "openai", "claude", "deepseek"
    "langbly": {
      "key": "[ENCRYPTED BY CHROME]",
      "lastTested": "2026-06-26T10:00:00Z"
    }
    // ... other provider keys
  }
}
```

**IndexedDB (translationHistory):**
```javascript
{
  database: "MantraDB",
  version: 1,
  stores: {
    translations: {
      keyPath: "id",
      indexes: [
        { name: "createdAt", keyPath: "createdAt" },
        { name: "siteUrl", keyPath: "siteUrl" }
      ]
    }
  },
  document: {
    id: "uuid-v4",
    originalImageBlob: Blob,
    translatedImageBlob: Blob,
    originalText: String,
    translatedText: String,
    siteUrl: String,
    sourceLang: "ja",
    targetLang: "id",
    translationModel: "langbly",
    timestamp: ISOString,
    canvasSettings: Object
  }
}
```

### **Layer 4: API Integration Modules**

#### **4.1 OCR Module (ocr.js)**
```javascript
class GoogleCloudOcrHandler {
  async performOcr(imageBlob, apiKey) {
    // 1. Convert blob to base64
    // 2. Call Google Cloud Vision API
    // 3. Parse response: { fullText, textAnnotations, ...}
    // 4. Return structured: { text, regions: [{bounds, text}] }
  }

  validateApiKey(key) {
    // Test connection
  }
}
```

#### **4.2 Translation Module (translation.js)**
```javascript
class TranslationOrchestrator {
  constructor(provider, apiKey) {}

  async translate(text, targetLang, sourceDetectedLang) {
    // 1. Detect source language (if not provided)
    // 2. Call appropriate provider API
    // 3. Return { originalText, translatedText, language }
  }
}

// Handlers for each provider:
class LangblyHandler {}
class OpenRouterHandler {}
class GeminiHandler {}
class OpenAIHandler {}
class ClaudeHandler {}
class DeepSeekHandler {}
```

#### **4.3 Canvas Renderer (canvas-renderer.js)**
**Critical Algorithm: Perfect Positioning Priority**

```javascript
class CanvasTextRenderer {
  constructor(settings) {}

  async renderTranslationOnCanvas(imageElement, textRegions, translations) {
    // For each text region:
    // 1. Get bounding box {x, y, width, height}
    // 2. Estimate optimal font size (fit translated text)
    // 3. If overflow: apply smart wrapping + reduce font size
    // 4. Render on canvas with settings (color, stroke, alignment)
    // 5. Return canvas as blob
  }

  calculateOptimalFontSize(text, fontFamily, maxWidth, minFontSize) {
    // Binary search for best fit
    // Priority: text readability > perfect bounds fit
  }

  wrapText(text, context, maxWidth) {
    // Split long text into multiple lines
    // Return: [{line, y}, ...]
  }

  drawTextOnCanvas(canvas, text, x, y, fontSize, settings) {
    // Apply color, stroke, alignment
    // Handle text anchor points for centering
  }
}
```

### **Layer 5: UI Components (React)**

#### **5.1 Popup (popup.jsx)**
```
Quick view:
- [Toggle Button] "Enable on this page"
- [Last 3 translations thumbnail gallery]
- [Button] "Open Full Settings"
- [Button] "Open History"
```

#### **5.2 Settings Page (options.jsx)**
```
Tabs:
1. API Keys
   - Google Cloud Vision API Key input
   - Translation Provider dropdown
   - Provider-specific key inputs (Langbly, OpenRouter, etc.)
   - [Test Connection buttons]

2. Translation
   - Target Language dropdown
   - Auto-detect source language toggle
   - Context sharing toggle (Phase 2)

3. Appearance
   - Font Family selector
   - Font Size slider (6px - 48px)
   - Font Color picker
   - Stroke Color picker
   - Stroke Size slider (0 - 10px)
   - Text Alignment selector (left, center, right, justify)
   - Line Spacing slider
   - Letter Spacing slider
   - Border Radius slider
   - Border Padding slider
   - Theme selector (light, dark)
   - Icon Opacity slider

4. History
   - [Thumbnail gallery of recent translations]
   - Auto-save toggle
   - Auto-delete dropdown (1 day, 1 week, 1 month, never)
   - [Clear All History button]
   - [Export to ZIP button]

5. About
   - Version info
   - Logo
   - Links (GitHub, feedback, etc.)
```

---

## 3. MESSAGE PASSING (IPC)

### **Content Script → Background**

```javascript
// Request OCR
chrome.runtime.sendMessage({
  action: "performOcr",
  imageData: imageBlob // Blob or base64
}, (response) => {
  // response: { success, ocrResult, error }
});

// Request Translation
chrome.runtime.sendMessage({
  action: "translateText",
  text: "こんにちは",
  targetLang: "id",
  provider: "langbly"
}, (response) => {
  // response: { success, translated, language, error }
});

// Save to History
chrome.runtime.sendMessage({
  action: "saveToHistory",
  data: {
    originalImageBlob,
    translatedImageBlob,
    originalText,
    translatedText,
    ocrResult,
    settings
  }
}, (response) => {
  // response: { success, id, error }
});
```

### **Background → Content Script**

```javascript
// Notify translation complete
chrome.tabs.sendMessage(tabId, {
  action: "renderTranslation",
  imageElement: {selector, src},
  canvasData: dataUrl
});
```

---

## 4. STORAGE API CONTRACTS

### **Settings**
```javascript
// Get setting
const value = await StorageManager.getSetting("fontSize");

// Save setting
await StorageManager.setSetting("fontSize", 18);

// Save multiple
await StorageManager.saveSettings({fontSize: 18, fontFamily: "Heroika"});

// Get all
const allSettings = await StorageManager.getSettings();
```

### **API Keys**
```javascript
// Save API key (encrypted automatically by Chrome)
await StorageManager.setApiKey("googleCloud", apiKeyString);

// Retrieve API key
const key = await StorageManager.getApiKey("googleCloud");

// Delete API key
await StorageManager.deleteApiKey("googleCloud");

// List all keys (returns only provider names, not actual keys)
const providers = await StorageManager.listApiKeys();
```

### **History**
```javascript
// Save translation to IndexedDB
const id = await HistoryManager.save({
  originalImageBlob,
  translatedImageBlob,
  originalText,
  translatedText,
  // ... metadata
});

// Get translation by ID
const translation = await HistoryManager.getById(id);

// Get recent (limit, offset)
const recent = await HistoryManager.getRecent(20, 0);

// Delete by ID
await HistoryManager.delete(id);

// Clear all
await HistoryManager.clear();

// Export to ZIP
const zipFile = await HistoryManager.exportAsZip();
```

---

## 5. GOOGLE CLOUD VISION API INTEGRATION

### **Request Format**
```javascript
const request = {
  requests: [
    {
      image: {
        content: base64ImageData
      },
      features: [
        {
          type: "TEXT_DETECTION"
        }
      ]
    }
  ]
};

const response = await fetch(
  `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
  {
    method: "POST",
    body: JSON.stringify(request)
  }
);

const data = await response.json();
// data.responses[0].textAnnotations
```

### **Response Parsing**
```javascript
function parseOcrResponse(apiResponse) {
  const annotations = apiResponse.responses[0].textAnnotations;
  
  return {
    fullText: annotations[0].description,
    textRegions: annotations.slice(1).map(annotation => ({
      text: annotation.description,
      bounds: annotation.boundingPoly.vertices, // [{x, y}, ...]
      confidence: annotation.confidence
    }))
  };
}
```

---

## 6. LLM TRANSLATION API INTEGRATIONS

### **6.1 Langbly (Default Free Tier)**
```javascript
const request = {
  text: "こんにちは",
  target_language: "id",
  api_key: userApiKey
};

const response = await fetch("https://api.langbly.com/translate", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify(request)
});

const data = await response.json();
// data.translated_text
```

### **6.2 OpenRouter**
```javascript
const request = {
  model: "openrouter/auto",
  messages: [
    {
      role: "user",
      content: `Translate to Indonesian: ${japaneseText}`
    }
  ]
};

const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(request)
});

const data = await response.json();
// data.choices[0].message.content
```

### **6.3 Google Gemini**
```javascript
const request = {
  contents: [
    {
      parts: [
        {
          text: `Translate to Indonesian: ${japaneseText}`
        }
      ]
    }
  ]
};

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
  {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(request)
  }
);

const data = await response.json();
// data.candidates[0].content.parts[0].text
```

### **6.4 OpenAI (GPT-3.5/GPT-4)**
```javascript
const request = {
  model: "gpt-3.5-turbo",
  messages: [
    {
      role: "system",
      content: "You are a manga translator. Translate Japanese to Indonesian, keeping the tone natural and conversational."
    },
    {
      role: "user",
      content: `Translate to Indonesian: ${japaneseText}`
    }
  ],
  temperature: 0.7,
  max_tokens: 200
};

const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(request)
});

const data = await response.json();
// data.choices[0].message.content
```

### **6.5 Anthropic Claude**
```javascript
const request = {
  model: "claude-3-haiku-20240307",
  max_tokens: 200,
  system: "You are a manga translator. Translate Japanese to Indonesian.",
  messages: [
    {
      role: "user",
      content: `Translate: ${japaneseText}`
    }
  ]
};

const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  },
  body: JSON.stringify(request)
});

const data = await response.json();
// data.content[0].text
```

### **6.6 DeepSeek**
```javascript
const request = {
  model: "deepseek-chat",
  messages: [
    {
      role: "user",
      content: `Translate to Indonesian: ${japaneseText}`
    }
  ]
};

const response = await fetch("https://api.deepseek.com/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(request)
});

const data = await response.json();
// data.choices[0].message.content
```

---

## 7. GOOGLE FONTS INTEGRATION

All manga fonts loaded via Google Fonts API:

```html
<!-- In options.html and popup.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Comfortaa&family=Fredoka+One&family=Fredoka:wght@400;700&family=Fredoka+Mono&family=Fredoka+Sans&display=swap" rel="stylesheet">
```

**Font Mapping:**
| Display Name | Google Fonts Name | Use Case |
|---|---|---|
| WildWords | Fredoka One | Clean, modern manga |
| Heroika | Fredoka | Bold, impactful text |
| Shonen | Fredoka Mono | Classic manga style |
| Komika Jam | Comfortaa | Playful, rounded |
| Bangers | Bangers | Comic/action emphasis |

---

## 8. LANGUAGE DETECTION (francjs)

```javascript
import franc from 'franc-min';

function detectLanguage(text) {
  const langCode = franc(text, {minLength: 5});
  
  // Map franc codes to standard ISO 639-1
  const mapping = {
    'jpn': 'ja',
    'zho': 'zh',
    'kor': 'ko',
    'eng': 'en'
  };
  
  return mapping[langCode] || 'ja'; // Default to Japanese for manga
}
```

**Fallback Logic:**
- If detected language has < 5 characters, default to `ja`
- If confidence is low, default to user's last detected language
- User can override in settings

---

## 9. CANVAS RENDERING ALGORITHM (Critical)

### **Perfect Positioning Priority Algorithm**

```javascript
async function renderTextWithPerfectPositioning(
  canvas,
  text,
  originalBounds, // {x, y, width, height}
  fontFamily,
  maxFontSize,
  settings
) {
  const ctx = canvas.getContext('2d');
  const minFontSize = 6;
  
  // Step 1: Binary search for optimal font size
  let optimalFontSize = binarySearchFontSize(
    text,
    fontFamily,
    originalBounds.width,
    minFontSize,
    maxFontSize,
    ctx
  );
  
  // Step 2: Measure text with optimal size
  ctx.font = `${optimalFontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  
  // Step 3: Check if text fits in original bounds
  if (metrics.width <= originalBounds.width) {
    // Perfect fit! Render directly
    drawTextOnBounds(ctx, text, originalBounds, optimalFontSize, settings);
  } else {
    // Overflow: Apply smart wrapping
    const lines = wrapTextToFit(
      text,
      fontFamily,
      optimalFontSize,
      originalBounds.width
    );
    
    // Recalculate font size if wrapped text exceeds height
    if (lines.length > estimatedLines(originalBounds.height, optimalFontSize)) {
      optimalFontSize = Math.max(
        minFontSize,
        optimalFontSize * 0.8 // Reduce 20%
      );
      ctx.font = `${optimalFontSize}px ${fontFamily}`;
    }
    
    // Render wrapped text
    drawWrappedTextOnBounds(
      ctx,
      lines,
      originalBounds,
      optimalFontSize,
      settings
    );
  }
  
  return canvas.toBlob('image/png');
}

function binarySearchFontSize(text, fontFamily, maxWidth, minSize, maxSize, ctx) {
  let low = minSize, high = maxSize;
  let result = minSize;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    ctx.font = `${mid}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    
    if (metrics.width <= maxWidth) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  
  return result;
}

function wrapTextToFit(text, fontFamily, fontSize, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  const ctx = new OffscreenCanvas(1, 1).getContext('2d');
  ctx.font = `${fontSize}px ${fontFamily}`;
  
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawTextOnBounds(ctx, text, bounds, fontSize, settings) {
  // Apply settings
  ctx.fillStyle = settings.fontColor;
  ctx.strokeStyle = settings.strokeColor;
  ctx.lineWidth = settings.strokeSize;
  ctx.font = `${fontSize}px ${settings.fontFamily}`;
  ctx.textAlign = settings.textAlignment || 'center';
  ctx.textBaseline = 'middle';
  
  const x = bounds.x + (bounds.width / 2);
  const y = bounds.y + (bounds.height / 2);
  
  // Draw stroke first
  if (settings.strokeSize > 0) {
    ctx.strokeText(text, x, y);
  }
  
  // Draw text
  ctx.fillText(text, x, y);
}
```

---

## 10. ERROR HANDLING & FALLBACKS

### **OCR Errors**
```javascript
try {
  const result = await performOcr(image, apiKey);
} catch (error) {
  if (error.message.includes("401")) {
    // Invalid API key
    showError("Invalid Google Cloud API key. Check settings.");
  } else if (error.message.includes("403")) {
    // Quota exceeded
    showError("Google Cloud quota exceeded. Reset next month.");
  } else if (error.message.includes("429")) {
    // Rate limited
    showError("Too many requests. Please wait a moment.");
  } else {
    showError("OCR failed: " + error.message);
  }
}
```

### **Translation Errors**
```javascript
try {
  const result = await translateText(text, lang, provider, apiKey);
} catch (error) {
  if (provider === "langbly" && error.status === 402) {
    // No credits (unlikely for free tier, but handle)
    showError("Translation quota exceeded.");
  } else {
    // Fallback to direct text (no translation)
    showWarning("Translation failed. Showing original text.");
    return { translated: text, language: detectedLang };
  }
}
```

### **Storage Errors**
```javascript
try {
  await HistoryManager.save(data);
} catch (error) {
  console.error("Failed to save to history:", error);
  showWarning("Could not save translation to history.");
  // Continue anyway - don't block user
}
```

---

## 11. PERFORMANCE OPTIMIZATION

### **Lazy Loading**
- Don't OCR until user clicks icon
- Don't render canvas until translation complete
- Defer history sync to background

### **Caching**
- Cache translation results in IndexedDB by text hash
- Cache API key test results (valid for 24h)
- Cache image processing results per URL

### **Resource Management**
- Limit concurrent API requests to 3 (prevent API throttling)
- Use OffscreenCanvas for font metrics calculation (don't block UI)
- Debounce font size slider input (500ms)

### **Bundle Size**
- Use dynamic imports for heavy libraries
- Tree-shake unused dependencies
- Minify all CSS/JS

---

## 12. SECURITY CHECKLIST

- ✅ Never log API keys (use masked display: "sk-...xyz")
- ✅ Store sensitive data only in chrome.storage.sync
- ✅ Validate all user inputs (API keys, URLs)
- ✅ Use HTTPS only for all API calls
- ✅ Implement CSP headers in manifest
- ✅ No inline scripts, all code external
- ✅ Sanitize canvas data before download
- ✅ Clear sensitive data from memory after use

---

## 13. BROWSER COMPATIBILITY

### **Primary: Chrome 90+**
- Full MV3 support
- All features tested

### **Secondary: Edge 90+**
- Chromium-based, same as Chrome
- Minor UI tweaks may needed

### **Future: Firefox**
- Requires MV2 adaptation
- Different API contracts
- Phase 2+ target

---

## 14. DEVELOPMENT ENVIRONMENT SETUP

```bash
# Node 18.x required
node --version

# Install dependencies
npm install

# Development build (with hot reload)
npm run dev

# Production build
npm run build

# Test extension
npm run test:extension

# Lint
npm run lint

# Format
npm run format
```

### **Testing with web-ext**
```bash
# Load unpacked extension
web-ext run --source-dir=dist

# Build for submission
web-ext build --source-dir=dist
```

---

**NEXT STEP:** Review `/docs/02_design_guide.md` for UI specifications, then `/docs/03_features/01_extension-shell.md` to begin Phase 1 implementation.
