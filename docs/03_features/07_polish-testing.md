# Feature 07: Polish, Testing & Release
## Phase 7 — v1.0 Readiness

**Objective:** Bring Mantra Extension from "feature-complete" to "release-ready" through performance tuning, error-handling polish, security review, cross-site/cross-browser testing, and final packaging.

**Timeline:** 2-3 days
**Dependencies:** Phases 1-6 complete and individually tested

**Acceptance Criteria:**
- ✅ End-to-end latency < 5s per image on representative manga page
- ✅ Memory < 50MB idle, < 120MB during translation
- ✅ All toast/error messages user-friendly and actionable
- ✅ Extension loads in Chrome and Edge without errors
- ✅ Tested on 5+ manga sites (MangaDex, MangaPlus, etc.)
- ✅ Security review checklist completed
- ✅ Final `dist/` folder packaged and ready to load unpacked

---

## 1. PERFORMANCE TUNING

### **1.1 Concurrency Limits**

Prevent simultaneous OCR requests from same user/page:

```javascript
// src/content-script.js
const inFlight = new Set();

async function handleIconClick(imgElement, iconElement) {
  const key = imgElement.src;
  if (inFlight.has(key)) {
    showToast('Translation already in progress for this image.', 'info');
    return;
  }
  inFlight.add(key);
  try {
    // ... existing logic
  } finally {
    inFlight.delete(key);
  }
}
```

### **1.2 Debounce Settings UI Updates**

Slider changes shouldn't write to storage 100x per second:

```javascript
// src/components/settings/AppearanceTab.jsx
import { useEffect, useRef, useState } from 'react';

function useDebouncedSetting(value, onChange, delay = 300) {
  const [local, setLocal] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => setLocal(value), [value]);

  const update = (newVal) => {
    setLocal(newVal);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onChange(newVal), delay);
  };

  return [local, update];
}

// Use in SliderRow:
function SliderRow({ label, value, onChange, ... }) {
  const [localValue, setLocalValue] = useDebouncedSetting(value, onChange, 300);
  // ... render with localValue
}
```

### **1.3 Lazy Font Loading**

Only load the currently selected font, not all 5 at startup:

```javascript
// src/content-script.js
let preloadedFont = null;

async function ensureFontLoaded(fontKey) {
  if (preloadedFont === fontKey) return;
  await loadFont(fontKey);
  preloadedFont = fontKey;
}

// In render handler:
await ensureFontLoaded(settings.fontFamily);
```

### **1.4 Image Bitmap Reuse**

Cache `ImageBitmap` for repeated renders of same image:

```javascript
// src/modules/canvas/renderer.js
const bitmapCache = new WeakMap(); // Keyed by Blob

async function getOrCreateBitmap(blob) {
  if (bitmapCache.has(blob)) return bitmapCache.get(blob);
  const bitmap = await createImageBitmap(blob);
  bitmapCache.set(blob, bitmap);
  return bitmap;
}
```

### **1.5 MutationObserver Throttling**

Don't process every single DOM change — batch with `requestIdleCallback`:

```javascript
// src/content-script.js
let pendingImages = new Set();
let scheduledScan = false;

function scheduleImageScan(newImages) {
  for (const img of newImages) pendingImages.add(img);
  if (scheduledScan) return;
  scheduledScan = true;

  const cb = () => {
    for (const img of pendingImages) injectFloatingIcon(img);
    pendingImages.clear();
    scheduledScan = false;
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(cb, { timeout: 500 });
  } else {
    setTimeout(cb, 100);
  }
}
```

---

## 2. ERROR HANDLING POLISH

### **2.1 Unified Error → User Message Mapping**

### **File: `src/modules/error-messages.js`**

```javascript
export const ERROR_MESSAGES = {
  // OCR errors
  NO_API_KEY: {
    message: 'Google Cloud API key not set.',
    action: 'Open Settings',
    actionPayload: { tab: 'api' }
  },
  AUTH_ERROR: {
    message: 'API key is invalid or expired.',
    action: 'Check Settings'
  },
  QUOTA_EXCEEDED: {
    message: 'Free tier quota reached. Resets monthly.',
    action: 'Try Different Provider'
  },
  RATE_LIMITED: {
    message: 'Too many requests. Wait a moment.',
    action: 'Retry in 30s'
  },
  SERVER_ERROR: {
    message: 'Provider server error.',
    action: 'Retry'
  },
  PARSE_ERROR: {
    message: 'Got an unexpected response. Try switching provider.',
    action: 'Switch Provider'
  },
  NETWORK_ERROR: {
    message: 'No internet connection.',
    action: 'Check Connection'
  },
  IMAGE_CORS: {
    message: 'Could not access image due to site security.',
    action: null
  },
  IMAGE_LOAD_FAILED: {
    message: 'Image failed to load.',
    action: 'Retry'
  },
  RENDER_FAILED: {
    message: 'Could not render translated image.',
    action: 'Report Issue'
  },
  NO_TEXT_FOUND: {
    message: 'No text detected in this image.',
    action: null
  },
  UNKNOWN: {
    message: 'Something went wrong.',
    action: 'Retry'
  }
};

export function getErrorDisplay(code, customMessage) {
  const def = ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN;
  return {
    message: customMessage || def.message,
    action: def.action,
    actionPayload: def.actionPayload
  };
}
```

Use in content script:

```javascript
import { getErrorDisplay } from './modules/error-messages.js';

function handleOcrError(response) {
  const display = getErrorDisplay(response.errorCode, response.error);
  showToast(display.message, 'error', {
    action: display.action,
    onAction: () => handleErrorAction(display.actionPayload)
  });
}

function handleErrorAction(payload) {
  if (payload?.tab) {
    chrome.storage.local.set({ openSettingsTab: payload.tab });
    chrome.runtime.sendMessage({ action: 'openSettings' });
  }
}
```

### **2.2 Toast with Action Button**

Enhance the toast to support an inline action button:

```javascript
function showToast(message, type = 'info', options = {}) {
  const toast = document.createElement('div');
  toast.className = `mantra-toast mantra-toast-${type}`;

  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);

  if (options.action && options.onAction) {
    const btn = document.createElement('button');
    btn.className = 'mantra-toast-action';
    btn.textContent = options.action;
    btn.addEventListener('click', () => {
      options.onAction();
      removeToast(toast);
    });
    toast.appendChild(btn);
  }

  document.body.appendChild(toast);

  const timeout = options.duration || (type === 'error' ? 5000 : 3000);
  setTimeout(() => removeToast(toast), timeout);

  function removeToast(t) {
    t.style.animation = 'slideOut 300ms ease';
    setTimeout(() => t.remove(), 300);
  }
}
```

---

## 3. SECURITY REVIEW CHECKLIST

| # | Check | Status |
|---|-------|--------|
| 1 | API keys never appear in `console.log` or `console.error` | Audit all log statements |
| 2 | API keys never sent to non-provider endpoints | grep for `fetch` calls; ensure URLs match expected providers |
| 3 | No third-party analytics or tracking | Verify no Google Analytics, Sentry, etc. wired in |
| 4 | Content Security Policy enforced | Review `manifest.json` CSP |
| 5 | All fetched URLs use HTTPS | Audit fetch() calls |
| 6 | No `eval()` or `new Function()` anywhere | grep for `eval\\|new Function` |
| 7 | No inline `<script>` in extension HTML | All scripts external |
| 8 | User-controlled strings not injected as HTML | Use `.textContent`, never `.innerHTML` with user data |
| 9 | API responses sanitized before rendering | Treat all API output as untrusted text |
| 10 | IndexedDB blobs not accessible to other extensions | Default IndexedDB scoping is per-origin |
| 11 | Permissions in manifest are minimal | Confirm `host_permissions: <all_urls>` is necessary (yes, for manga sites) |
| 12 | No telemetry or remote config | Confirm no calls to non-essential endpoints |

### **Add to manifest.json:**

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

---

## 4. CROSS-SITE TESTING MATRIX

| Site | Image Detection | OCR Capture | Overlay Position | Notes |
|------|-----------------|-------------|------------------|-------|
| MangaDex | ✅ | ✅ | ✅ | Reader page is `<div>` with `<img>` |
| MangaPlus by Shueisha | Verify | Verify | Verify | Webtoon-style vertical scroll |
| Webtoon | Verify | Verify | Verify | Long single image per chapter |
| Bato.to | Verify | Verify | Verify | Generic image gallery |
| Raw manga site (sample) | Verify | Verify | Verify | Various |
| Personal blog with manga | Verify | Verify | Verify | Embedded `<img>` in article |

**Testing protocol:**
1. Load unpacked extension in Chrome dev mode
2. Visit site, confirm icon appears on every manga image
3. Click icon, verify OCR + translation succeed
4. Check overlay positioning correct
5. Scroll, verify overlay stays anchored
6. Refresh page, verify icons reappear correctly

---

## 5. CROSS-BROWSER COMPATIBILITY

### **Chrome (Primary)**
- ✅ Manifest V3 native
- ✅ All APIs available
- ✅ chrome.alarms, chrome.downloads, chrome.storage.sync

### **Edge (Chromium-based)**
- ✅ Identical to Chrome for our needs
- Verify install via "Load unpacked" in Edge

### **Firefox (v2 target)**
- ⚠️ MV3 in Firefox is still maturing
- Service workers replaced by event-driven background pages
- chrome.alarms supported via `browser.alarms`
- Separate manifest needed (deferred to post-v1)

### **Brave (Chromium-based)**
- ✅ Should work identically to Chrome
- Verify ad-blocker doesn't strip floating icon

---

## 6. PACKAGING & DISTRIBUTION

### **6.1 Build Script**

### **File: `package.json` (scripts section)**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build && npm run copy:manifest && npm run copy:icons",
    "copy:manifest": "cp manifest.json dist/manifest.json",
    "copy:icons": "cp -r public/icons dist/public/icons",
    "package": "npm run build && cd dist && zip -r ../mantra-extension-v1.0.0.zip ."
  }
}
```

### **6.2 Vite Config**

### **File: `vite.config.js`**

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'public/popup.html'),
        options: resolve(__dirname, 'public/options.html'),
        background: resolve(__dirname, 'src/background.js'),
        'content-script': resolve(__dirname, 'src/content-script.js')
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'src/background.js';
          if (chunk.name === 'content-script') return 'src/content-script.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    outDir: 'dist',
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true
  }
});
```

### **6.3 Final `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Mantra - Manga Translator",
  "version": "1.0.0",
  "description": "Translate manga text in-place using Google Cloud Vision OCR and your favorite LLM. Perfect-positioning canvas overlay, multi-font support, browsable history.",
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
    "scripting",
    "alarms",
    "downloads"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "src/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content-script.js"],
      "css": ["src/styles/content.css"],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["public/icons/*", "assets/*"],
      "matches": ["<all_urls>"]
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### **6.4 Installation Instructions (for README)**

```markdown
## Installation (Personal Use)

1. Clone this repo: `git clone https://github.com/zayn/mantra`
2. Install deps: `npm install`
3. Build: `npm run build`
4. Open Chrome → `chrome://extensions`
5. Enable "Developer mode" (top right)
6. Click "Load unpacked" → select the `dist/` folder
7. Pin Mantra to toolbar for easy access
8. Open Settings (toolbar icon → Settings button)
9. Enter your Google Cloud Vision API key
10. Enter at least one translation provider API key
11. Visit any manga site and click the floating M icon on an image
```

---

## 7. SMOKE-TEST CHECKLIST (FINAL)

Run all of these before declaring v1.0:

| # | Step | Pass/Fail |
|---|------|-----------|
| 1 | Load unpacked extension in Chrome | ☐ |
| 2 | No console errors on install | ☐ |
| 3 | Floating icon appears on test page with images | ☐ |
| 4 | Icon hover opacity changes 0.3 → 1.0 | ☐ |
| 5 | Open popup → toggle works | ☐ |
| 6 | Open settings → all 5 tabs render | ☐ |
| 7 | Enter Google Cloud key → Test passes | ☐ |
| 8 | Enter Langbly key → Test passes | ☐ |
| 9 | Click icon on manga image → OCR succeeds | ☐ |
| 10 | Translation appears overlaid correctly | ☐ |
| 11 | Click overlay → dismisses | ☐ |
| 12 | Double-click overlay → downloads PNG | ☐ |
| 13 | History gallery shows the translation | ☐ |
| 14 | Click thumbnail → detail modal opens | ☐ |
| 15 | Export All as ZIP → downloads | ☐ |
| 16 | Open ZIP → structure correct | ☐ |
| 17 | Change font in settings → next translation uses new font | ☐ |
| 18 | Change provider → next translation uses new provider | ☐ |
| 19 | Disconnect internet → friendly error message | ☐ |
| 20 | Invalid API key → friendly error message | ☐ |
| 21 | No memory leak after 20 translations (DevTools heap) | ☐ |
| 22 | Reload page → icons reappear correctly | ☐ |
| 23 | Test on Edge → works identically | ☐ |
| 24 | Test on MangaDex → end-to-end success | ☐ |
| 25 | Auto-delete alarm fires after 24h (manual test via DevTools) | ☐ |

---

## 8. PERFORMANCE BENCHMARKS (Final)

Measure on representative manga page (e.g. MangaDex chapter with 20 images):

| Metric | Target | Acceptable | Actual |
|--------|--------|-----------|--------|
| Icon injection time (per image) | < 5ms | < 20ms | ☐ |
| OCR roundtrip (cache miss) | < 2s | < 3s | ☐ |
| OCR roundtrip (cache hit) | < 50ms | < 200ms | ☐ |
| Translation roundtrip (cache miss) | < 2s | < 4s | ☐ |
| Translation roundtrip (cache hit) | < 50ms | < 200ms | ☐ |
| Canvas rendering | < 500ms | < 1s | ☐ |
| Total end-to-end (cache miss) | < 5s | < 7s | ☐ |
| Total end-to-end (cache hit) | < 500ms | < 1s | ☐ |
| Memory idle | < 30MB | < 50MB | ☐ |
| Memory active translation | < 80MB | < 120MB | ☐ |

---

## 9. RELEASE PREP

### **9.1 Final Repo Structure**

```
mantra-extension/
├── README.md
├── LICENSE (MIT or similar)
├── .gitignore
├── package.json
├── package-lock.json
├── vite.config.js
├── manifest.json
├── public/
│   ├── icons/
│   ├── popup.html
│   └── options.html
├── src/
│   ├── background.js
│   ├── content-script.js
│   ├── popup.jsx
│   ├── options.jsx
│   ├── components/
│   ├── modules/
│   └── styles/
├── docs/                      ← This PRD
└── dist/                      ← Build output (gitignored)
```

### **9.2 README.md Highlights**

- Quick start install instructions (above)
- Screenshot of extension in action
- List of supported providers
- Privacy statement: "No data leaves your browser except to providers you configure"
- License info
- Link to docs/ folder for technical details

### **9.3 Version Tag**

```bash
git tag -a v1.0.0 -m "Mantra Extension v1.0.0 — Initial release"
git push origin v1.0.0
```

---

## 10. ACCEPTANCE TESTS (META)

| # | Test | Expected |
|---|------|----------|
| 1 | All 25 smoke tests pass | ✅ |
| 2 | All performance benchmarks within "Acceptable" column | ✅ |
| 3 | Security checklist 12/12 verified | ✅ |
| 4 | Cross-site testing 4+ sites confirmed working | ✅ |
| 5 | Built ZIP loads in Chrome and Edge | ✅ |
| 6 | No regressions from earlier phases | ✅ |
| 7 | README clear enough for non-developer to install | ✅ |

---

## 11. POST-RELEASE — v1.1 BACKLOG (Reference Only)

Items intentionally deferred from v1.0:

- Erase/paint tools for manual cleanup
- AI inpainting for text removal
- Context sharing across translations (character/term consistency)
- Firefox MV2 support
- Site-specific optimizations (custom selectors per manga site)
- Mobile companion app
- Cloud sync of history across devices
- Custom prompt editor (BYOP — Bring Your Own Prompt)
- More fonts (10+ manga fonts)
- Translation quality voting / favorite/unfavorite

---

## 12. DELIVERABLES

✅ Performance optimizations applied (concurrency, debounce, lazy font, bitmap cache, throttled observer)
✅ Unified error message catalog with actionable toasts
✅ Security checklist completed (12/12)
✅ Cross-site testing matrix executed
✅ Chrome + Edge compatibility verified
✅ Final `manifest.json` with CSP and minimal permissions
✅ Vite build outputs deployable `dist/` folder
✅ README with quickstart install for personal use
✅ All 25 smoke tests passing
✅ v1.0.0 git tag created
✅ ZIP archive ready for handoff or sharing

---

# 🎉 RELEASE READY

After this phase, **Mantra Extension v1.0.0 is complete** and ready for daily use.
