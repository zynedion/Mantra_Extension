# Feature 05: Canvas Rendering with Perfect Positioning
## Phase 5 — Visual Output Layer

**Objective:** Render translated text directly onto the original image using HTML5 Canvas, with priority on perfect positioning within original speech bubble bounds. Output is a Blob that overlays the original image on-page.

**Timeline:** 4-5 days (hardest phase)
**Dependencies:** Phase 4 complete (translations available per region)

**Acceptance Criteria:**
- ✅ Translated text rendered cleanly in original bubble bounds
- ✅ Font auto-sizing fits longest line within bubble width
- ✅ Multi-line wrapping respects bubble height
- ✅ Original text covered with background (so it isn't visible underneath)
- ✅ All 5 manga fonts load and render correctly
- ✅ Stroke/outline rendered properly for readability
- ✅ Image with translations overlays original image in DOM
- ✅ User can dismiss overlay (click to close)
- ✅ User can download translated image directly

---

## 1. RENDERING PIPELINE OVERVIEW

```
mantra:translation-complete event received
  ↓
Load original image into OffscreenCanvas
  ↓
For each translated region:
  1. Cover original text area with bubble background (white/transparent)
  2. Compute optimal font size via binary search
  3. Wrap text into lines that fit bubble width
  4. Vertically center within bubble height (or top/bottom anchor based on text length)
  5. Draw stroke (outline) layer first
  6. Draw fill (text) layer on top
  7. Optional: rounded background pill for non-bubble text
  ↓
Convert canvas to Blob (PNG)
  ↓
Insert as <img> overlay in DOM positioned exactly over original
  ↓
Auto-save to history (if enabled)
  ↓
Show success toast + dismiss/download controls
```

---

## 2. FONT LOADING

### **File: `src/modules/fonts.js`**

```javascript
/**
 * Manga font registry mapping internal names to Google Fonts.
 */

export const FONTS = {
  WildWords: {
    googleFamily: 'Fredoka One',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap',
    fallback: 'sans-serif',
    cssName: '"Fredoka One", sans-serif'
  },
  Heroika: {
    googleFamily: 'Fredoka',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&display=swap',
    fallback: 'sans-serif',
    cssName: '"Fredoka", sans-serif'
  },
  Shonen: {
    googleFamily: 'Fredoka Mono',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Fredoka+Mono:wght@500;700&display=swap',
    fallback: 'monospace',
    cssName: '"Fredoka Mono", monospace'
  },
  KomikaJam: {
    googleFamily: 'Comfortaa',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@600;700&display=swap',
    fallback: 'cursive',
    cssName: '"Comfortaa", cursive'
  },
  Bangers: {
    googleFamily: 'Bangers',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Bangers&display=swap',
    fallback: 'cursive',
    cssName: '"Bangers", cursive'
  }
};

const loadedFonts = new Set();

/**
 * Preload a Google Font in document head and wait for it to be ready.
 * Must be called in DOM contexts (content script, popup, options).
 */
export async function loadFont(fontKey) {
  if (loadedFonts.has(fontKey)) return;
  const font = FONTS[fontKey];
  if (!font) throw new Error(`Unknown font: ${fontKey}`);

  // Inject <link> if not already present
  const existing = document.querySelector(`link[data-mantra-font="${fontKey}"]`);
  if (!existing) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = font.googleUrl;
    link.dataset.mantraFont = fontKey;
    document.head.appendChild(link);
  }

  // Wait for font to be ready
  if (document.fonts && document.fonts.load) {
    try {
      await document.fonts.load(`16px "${font.googleFamily}"`);
    } catch (err) {
      console.warn(`[Mantra] Font load timeout for ${fontKey}, continuing with fallback`);
    }
  }

  loadedFonts.add(fontKey);
}

/**
 * Preload all manga fonts at startup (background prefetch).
 */
export async function preloadAllFonts() {
  await Promise.all(Object.keys(FONTS).map(k => loadFont(k).catch(() => {})));
}
```

---

## 3. PERFECT POSITIONING ALGORITHM

### **File: `src/modules/canvas/text-fitter.js`**

```javascript
/**
 * Binary search for the largest font size that allows the text to fit
 * within the given bounds (width × height), with multi-line wrapping.
 */

const MIN_FONT_SIZE = 6;
const ABSOLUTE_MAX_FONT_SIZE = 96;

export function fitTextInBounds(text, bounds, fontFamilyCss, options = {}) {
  const {
    maxFontSize = ABSOLUTE_MAX_FONT_SIZE,
    minFontSize = MIN_FONT_SIZE,
    lineSpacingPercent = 100,
    padding = 4
  } = options;

  const innerWidth = bounds.width - padding * 2;
  const innerHeight = bounds.height - padding * 2;

  if (innerWidth <= 0 || innerHeight <= 0) {
    return { fontSize: minFontSize, lines: [text], lineHeight: minFontSize * (lineSpacingPercent / 100) };
  }

  // Try sizes from high to low using binary search
  let lo = minFontSize;
  let hi = Math.min(maxFontSize, innerHeight); // No point trying font larger than bubble height
  let bestFit = null;

  // Coarse search first
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const result = tryFitAtSize(text, mid, innerWidth, innerHeight, fontFamilyCss, lineSpacingPercent);
    if (result.fits) {
      bestFit = { fontSize: mid, ...result };
      lo = mid + 1; // Try larger
    } else {
      hi = mid - 1; // Try smaller
    }
  }

  if (!bestFit) {
    // Couldn't fit even at minimum — render at min with overflow allowed
    const fallback = tryFitAtSize(text, minFontSize, innerWidth, Infinity, fontFamilyCss, lineSpacingPercent);
    bestFit = { fontSize: minFontSize, ...fallback };
  }

  return bestFit;
}

function tryFitAtSize(text, fontSize, maxWidth, maxHeight, fontFamilyCss, lineSpacingPercent) {
  const lineHeight = fontSize * (lineSpacingPercent / 100);
  const lines = wrapText(text, fontSize, fontFamilyCss, maxWidth);

  const totalHeight = lines.length * lineHeight;
  const widestLine = Math.max(...lines.map(l => measureText(l, fontSize, fontFamilyCss)));

  const fits = widestLine <= maxWidth && totalHeight <= maxHeight;

  return { lines, lineHeight, fits, totalHeight, widestLine };
}

let measureCanvas = null;
let measureCtx = null;

function getMeasureContext() {
  if (!measureCtx) {
    // OffscreenCanvas works in workers, regular canvas as fallback
    if (typeof OffscreenCanvas !== 'undefined') {
      measureCanvas = new OffscreenCanvas(1, 1);
    } else {
      measureCanvas = document.createElement('canvas');
    }
    measureCtx = measureCanvas.getContext('2d');
  }
  return measureCtx;
}

function measureText(text, fontSize, fontFamilyCss) {
  const ctx = getMeasureContext();
  ctx.font = `${fontSize}px ${fontFamilyCss}`;
  return ctx.measureText(text).width;
}

/**
 * Wrap text into multiple lines that fit `maxWidth`. Handles both
 * space-separated languages (Latin, Indonesian) and CJK (Japanese/Chinese)
 * where you can break between any character.
 */
function wrapText(text, fontSize, fontFamilyCss, maxWidth) {
  // First respect explicit \n
  const paragraphs = text.split('\n').map(p => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return [text];

  const allLines = [];
  for (const para of paragraphs) {
    if (containsCJK(para) && !para.includes(' ')) {
      // CJK without spaces — break character by character
      allLines.push(...wrapByCharacter(para, fontSize, fontFamilyCss, maxWidth));
    } else {
      // Space-delimited — break word by word
      allLines.push(...wrapByWord(para, fontSize, fontFamilyCss, maxWidth));
    }
  }
  return allLines;
}

function wrapByWord(text, fontSize, fontFamilyCss, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureText(candidate, fontSize, fontFamilyCss) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // Check if single word is wider than maxWidth — break by character
      if (measureText(word, fontSize, fontFamilyCss) > maxWidth) {
        const chunks = wrapByCharacter(word, fontSize, fontFamilyCss, maxWidth);
        lines.push(...chunks.slice(0, -1));
        current = chunks[chunks.length - 1] || '';
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

function wrapByCharacter(text, fontSize, fontFamilyCss, maxWidth) {
  const lines = [];
  let current = '';
  for (const ch of text) {
    const candidate = current + ch;
    if (measureText(candidate, fontSize, fontFamilyCss) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = ch;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function containsCJK(text) {
  return /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/.test(text);
}
```

---

## 4. CANVAS RENDERER (CORE)

### **File: `src/modules/canvas/renderer.js`**

```javascript
import { FONTS, loadFont } from '../fonts.js';
import { fitTextInBounds } from './text-fitter.js';

/**
 * Render translated text onto original image, returning a new Blob.
 *
 * @param {Blob} originalImageBlob
 * @param {Array} regions - [{ id, text, translatedText, bounds, vertices }]
 * @param {Object} settings - from SettingsStore
 * @returns {Promise<Blob>} PNG blob of translated image
 */
export async function renderTranslatedImage(originalImageBlob, regions, settings) {
  // Load font
  await loadFont(settings.fontFamily);
  const fontFamilyCss = FONTS[settings.fontFamily]?.cssName || 'sans-serif';

  // Load original image
  const imgBitmap = await createImageBitmap(originalImageBlob);

  // Create canvas at native resolution
  const canvas = new OffscreenCanvas(imgBitmap.width, imgBitmap.height);
  const ctx = canvas.getContext('2d');

  // Draw original
  ctx.drawImage(imgBitmap, 0, 0);

  // Render each region
  for (const region of regions) {
    if (!region.translatedText?.trim()) continue;
    drawRegion(ctx, region, settings, fontFamilyCss);
  }

  // Convert to PNG blob
  return await canvas.convertToBlob({ type: 'image/png' });
}

/**
 * Draw a single translated region onto the canvas.
 * Steps:
 *   1. Cover original text with bubble fill (white pill or rect)
 *   2. Fit translated text into bounds
 *   3. Draw stroke + fill text
 */
function drawRegion(ctx, region, settings, fontFamilyCss) {
  const { bounds, vertices, translatedText } = region;

  // Step 1: Cover original text with background
  // Use vertices polygon if available (more accurate bubble shape),
  // else fall back to rounded rectangle of bounds.
  drawBackground(ctx, bounds, vertices, settings);

  // Step 2: Compute fit
  const padding = settings.borderPadding || 4;
  const fit = fitTextInBounds(translatedText, bounds, fontFamilyCss, {
    minFontSize: 6,
    maxFontSize: settings.fontSize * 2, // Use settings.fontSize as preferred, allow larger
    lineSpacingPercent: settings.lineSpacing || 100,
    padding
  });

  // Step 3: Draw text
  drawText(ctx, fit, bounds, settings, fontFamilyCss);
}

function drawBackground(ctx, bounds, vertices, settings) {
  ctx.save();

  // Determine background fill
  // For bubble-like text (mostly white bubble), use white.
  // Otherwise leave a slight padded box. For v1.0, simple white pill.
  ctx.fillStyle = '#ffffff';

  if (vertices && vertices.length >= 4) {
    // Use polygon path for accurate bubble shape with slight expansion
    const expanded = expandPolygon(vertices, 3); // 3px outward expand
    ctx.beginPath();
    ctx.moveTo(expanded[0].x, expanded[0].y);
    for (let i = 1; i < expanded.length; i++) {
      ctx.lineTo(expanded[i].x, expanded[i].y);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    // Rounded rect fallback
    const radius = settings.borderRadius || 8;
    drawRoundedRect(ctx, bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4, radius);
    ctx.fill();
  }

  ctx.restore();
}

function drawText(ctx, fit, bounds, settings, fontFamilyCss) {
  const { fontSize, lines, lineHeight } = fit;

  ctx.save();
  ctx.font = `${fontSize}px ${fontFamilyCss}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = settings.textAlignment === 'left' ? 'left'
                : settings.textAlignment === 'right' ? 'right'
                : 'center';

  // Letter spacing (modern canvas API)
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${settings.letterSpacing || 0}px`;
  }

  // Compute starting x based on alignment
  const padding = settings.borderPadding || 4;
  let x;
  if (ctx.textAlign === 'left') x = bounds.x + padding;
  else if (ctx.textAlign === 'right') x = bounds.x + bounds.width - padding;
  else x = bounds.x + bounds.width / 2;

  // Vertically center the block
  const totalHeight = lines.length * lineHeight;
  const startY = bounds.y + (bounds.height - totalHeight) / 2 + lineHeight / 2;

  // Draw each line
  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineHeight;

    // Stroke first (outline behind text)
    if (settings.strokeSize > 0) {
      ctx.strokeStyle = settings.strokeColor || '#ffffff';
      ctx.lineWidth = settings.strokeSize;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(lines[i], x, y);
    }

    // Fill on top
    ctx.fillStyle = settings.fontColor || '#000000';
    ctx.fillText(lines[i], x, y);
  }

  ctx.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function expandPolygon(vertices, amount) {
  // Compute centroid
  const cx = vertices.reduce((s, v) => s + v.x, 0) / vertices.length;
  const cy = vertices.reduce((s, v) => s + v.y, 0) / vertices.length;

  // Push each vertex away from centroid by `amount`
  return vertices.map(v => {
    const dx = v.x - cx;
    const dy = v.y - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return v;
    return {
      x: v.x + (dx / len) * amount,
      y: v.y + (dy / len) * amount
    };
  });
}
```

---

## 5. CONTENT SCRIPT — Wire Canvas Rendering

### **In `src/content-script.js`:**

```javascript
import { renderTranslatedImage } from './modules/canvas/renderer.js';
import { SettingsStore } from './modules/storage.js';

window.addEventListener('mantra:translation-complete', async (event) => {
  const { imgElement, imageBlob, regions } = event.detail;

  try {
    const settings = await SettingsStore.getAll();
    const translatedBlob = await renderTranslatedImage(imageBlob, regions, settings);
    overlayTranslatedImage(imgElement, translatedBlob);

    // Auto-save (Phase 6)
    if (settings.autoSave) {
      chrome.runtime.sendMessage({
        action: 'saveToHistory',
        entry: {
          originalImageData: await blobToArray(imageBlob),
          translatedImageData: await blobToArray(translatedBlob),
          regions,
          siteUrl: location.href,
          sourceLang: regions[0]?.sourceLang || 'ja',
          targetLang: settings.targetLanguage,
          translationModel: settings.translationProvider,
          canvasSettings: extractCanvasSettings(settings)
        }
      });
    }

    showToast('Translation complete! Click overlay to dismiss.', 'success');
  } catch (error) {
    console.error('[Mantra] Render failed:', error);
    showToast(`Rendering failed: ${error.message}`, 'error');
  }
});

function overlayTranslatedImage(imgElement, translatedBlob) {
  const url = URL.createObjectURL(translatedBlob);

  // Remove any existing overlay on this image
  const existing = document.querySelector(`[data-mantra-overlay-for="${imgElement.dataset.mantraIcon}"]`);
  if (existing) existing.remove();

  const overlay = document.createElement('img');
  overlay.src = url;
  overlay.className = 'mantra-overlay-image';
  overlay.dataset.mantraOverlayFor = imgElement.dataset.mantraIcon;
  overlay.title = 'Mantra translation — click to dismiss, double-click to download';

  positionOverlay(overlay, imgElement);

  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    e.stopPropagation();
    overlay.remove();
    URL.revokeObjectURL(url);
  });

  overlay.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    downloadImage(translatedBlob, `mantra-translation-${Date.now()}.png`);
  });

  // Reposition on scroll/resize
  const reposition = () => positionOverlay(overlay, imgElement);
  window.addEventListener('scroll', reposition, { passive: true });
  window.addEventListener('resize', reposition);

  // Cleanup observers when overlay removed
  const observer = new MutationObserver(() => {
    if (!document.body.contains(overlay)) {
      window.removeEventListener('scroll', reposition);
      window.removeEventListener('resize', reposition);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true });
}

function positionOverlay(overlay, imgElement) {
  const rect = imgElement.getBoundingClientRect();
  Object.assign(overlay.style, {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex: '9999',
    cursor: 'pointer',
    pointerEvents: 'auto'
  });
}

function downloadImage(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function blobToArray(blob) {
  const buf = await blob.arrayBuffer();
  return Array.from(new Uint8Array(buf));
}

function extractCanvasSettings(settings) {
  const keys = ['fontSize', 'fontFamily', 'fontColor', 'strokeColor', 'strokeSize',
                'textAlignment', 'lineSpacing', 'letterSpacing', 'borderRadius', 'borderPadding'];
  return Object.fromEntries(keys.map(k => [k, settings[k]]));
}
```

---

## 6. EDGE CASES & MITIGATIONS

| Case | Mitigation |
|------|------------|
| Translation longer than original (Indonesian often 1.5x Japanese) | Binary search font size, then wrap to multiple lines |
| Empty translation string | Skip region entirely, leave original visible |
| Vertical Japanese text | OCR returns horizontal bounds anyway; render horizontally (acceptable for v1) |
| Bubble with multiple paragraphs | OCR groups them into one region with `\n` separators — handled in `wrapText` |
| Image with no detected text | Skip rendering, toast "No text detected" |
| Bubble too small for even min font | Render at min font, allow slight overflow (logged warning) |
| Image with transparent background | `ctx.drawImage` preserves transparency; bubble background still white pill |
| High-DPI image (e.g. 4000px wide) | Render at native resolution, no downsampling |
| Image already has overlay | Remove old overlay before adding new one |

---

## 7. PERFORMANCE NOTES

- **OffscreenCanvas** is used for measurement and rendering — avoids blocking main thread.
- **Font loading** is async with timeout fallback; rendering proceeds with fallback font if Google Fonts is slow.
- **Binary search** for font sizing typically completes in ~5-7 iterations.
- **Image bitmap** is decoded once via `createImageBitmap` (faster than `<img>` load).
- Target: < 1s rendering per image (excluding font load on first run).

---

## 8. ACCEPTANCE TESTS

| # | Test | Expected |
|---|------|----------|
| 1 | Short Japanese → long Indonesian translation | Wrapped to 2-3 lines, fits within bubble |
| 2 | Very long English translation | Font auto-shrinks but stays readable |
| 3 | All 5 fonts selected one by one in settings | Each renders with correct typeface |
| 4 | Change stroke size 0 → 5px | Outline visible around text |
| 5 | Change text alignment left/center/right | Text aligns correctly within bubble |
| 6 | Bubble with polygon vertices (curved bubble) | Background follows bubble shape |
| 7 | Image with 10 separate speech bubbles | All 10 translated and overlaid correctly |
| 8 | Click overlay | Overlay removed, original visible again |
| 9 | Double-click overlay | Translated image downloads as PNG |
| 10 | Scroll page after overlay rendered | Overlay stays positioned on image |
| 11 | Render same image twice (different translations) | Old overlay replaced with new |
| 12 | Empty bubble (`translatedText: ''`) | Skipped, no rendering for that region |

---

## 9. DELIVERABLES

✅ `src/modules/fonts.js` — Manga font registry + async loader
✅ `src/modules/canvas/text-fitter.js` — Binary search + multi-language wrap
✅ `src/modules/canvas/renderer.js` — Full canvas rendering pipeline
✅ Updated `src/content-script.js` — Overlay positioning + click handlers
✅ All 5 manga fonts loaded from Google Fonts on demand
✅ Translation overlay with download capability
✅ Original image stays in place; overlay sits on top
✅ Auto-save dispatch to background (consumed by Phase 6)

**Next Phase:** Feature 06 — History & ZIP Export
