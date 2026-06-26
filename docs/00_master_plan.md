# Mantra - Manga Translator Extension
## Master Plan & Product Overview

**Version:** 1.0  
**Author:** Zayn (Solo Developer)  
**Last Updated:** June 26, 2026  
**Target Platform:** Chrome, Edge, Firefox (primary: Chrome)  
**Estimated Timeline:** 3-4 weeks MVP  

---

## 1. PRODUCT VISION

**What is Mantra?**

Mantra is a browser extension that translates manga text in-place by detecting text in manga images using Google Cloud Vision OCR, then overlaying clean translated text directly on the image. It's a personal reading tool designed specifically for manga/comic enthusiasts who want frictionless translation without leaving the page.

**Target User:** 
- Personal use (not commercial)
- Manga readers on sites like MangaDex, MangaPlus, webtoons, raw manga sites
- Users comfortable setting up API keys (Google Cloud Vision, LLM providers)

**Key Differentiators vs Torii:**
- ✅ Generic multi-site compatibility (works on any manga reader)
- ✅ BYOK (Bring Your Own Keys) for both OCR and translation
- ✅ Local history management (no cloud sync needed)
- ✅ Free tier fully functional (no credit system)
- ✅ Community-driven (open codebase concept)

---

## 2. ARCHITECTURE OVERVIEW

### **Extension Structure**
```
mantra-extension/
├── manifest.json                 (MV3 manifest)
├── public/
│   ├── icons/
│   │   ├── icon-16.png          (logo)
│   │   ├── icon-48.png
│   │   ├── icon-128.png
│   │   └── icon-256.png
│   ├── popup.html                (extension popup)
│   └── options.html              (settings page)
├── src/
│   ├── background.js             (service worker)
│   ├── content-script.js         (page injection)
│   ├── popup.jsx                 (React popup UI)
│   ├── options.jsx               (React settings page)
│   ├── modules/
│   │   ├── ocr.js                (Google Cloud Vision)
│   │   ├── translation.js        (LLM API handlers)
│   │   ├── canvas-renderer.js    (Text overlay)
│   │   ├── storage.js            (IndexedDB wrapper)
│   │   ├── history.js            (Translation history)
│   │   └── utils.js              (Helpers)
│   └── styles/
│       ├── popup.css
│       ├── options.css
│       ├── content.css           (Floating icon + canvas)
│       └── variables.css         (Design tokens)
└── build/                        (Distribution files)
```

### **Core Flows**

**1. Image Detection & Icon Display**
```
User opens manga page
  ↓
Content script detects <img> elements
  ↓
Floating "M" icon appears (top-left, semi-transparent)
  ↓
Icon hover → opacity 1.0 (fully visible)
```

**2. Text Translation Flow**
```
User clicks floating icon
  ↓
Capture image from page
  ↓
Send to Google Cloud Vision (OCR)
  ↓
Detect text regions + bounding boxes
  ↓
For each text box:
  - Extract text
  - Detect language (franc library)
  - Send to LLM for translation (BYOK API key)
  - Render translated text on canvas overlay
  ↓
Store in IndexedDB history
```

**3. Settings & Preferences**
```
User clicks extension icon in toolbar
  ↓
Opens popup
  ↓
Can access:
  - Quick toggle "Enable on this page"
  - Link to full settings page
```

**4. History & Export**
```
Auto-save toggle ON
  ↓
Each translation auto-saved to IndexedDB
  ↓
User can export history → ZIP file
  ↓
ZIP contains:
  - original image
  - translated image
  - metadata.json per translation
```

---

## 3. FEATURE SET

### **Core Features (MVP)**

1. **Floating Translator Icon**
   - Semi-transparent "M" logo (top-left corner)
   - Hover effect: opacity 0.3 → 1.0
   - Click to activate translation on current image
   - Customizable position in settings (v1.0 fixed at top-left)

2. **Google Cloud Vision OCR**
   - Detect text in images with bounding box precision
   - BYOK: User provides Google Cloud API key
   - Handles Japanese, Chinese, Korean, English text
   - Free tier: 1,000 images/month

3. **Multi-LLM Translation**
   - Support BYOK API keys:
     - Langbly (free tier)
     - OpenRouter
     - Google Gemini API
     - OpenAI (GPT-4, GPT-3.5)
     - Anthropic (Claude)
     - DeepSeek
   - Default: Langbly free tier (if user doesn't set key)
   - Language detection: francjs + default to Japanese

4. **Canvas-based Text Overlay**
   - Render translated text directly on image
   - Font customization:
     - Font family: WildWords, Heroika, Shonen, Komika Jam, Bangers
     - Font size: adjustable, min 6px
     - Color: text, stroke, background
     - Letter spacing, line spacing
     - Text alignment (left, center, right)
     - Stroke size (0-10px)
     - Border radius + padding
   - Perfect positioning priority (fit text within original bounds)
   - Smart wrapping + font size optimization for overflows

5. **History Management**
   - IndexedDB storage: max 500 translations
   - Auto-delete options: 1 day, 1 week, 1 month, never
   - Browsable history view in popup
   - Exportable to ZIP (originals + translations + metadata)

6. **Settings Panel**
   - **API Keys Tab**: Google Cloud Vision, LLM provider selection
   - **Translation Tab**: Target language, language detection
   - **Appearance Tab**: Icon opacity, font preferences, theme (light/dark)
   - **History Tab**: Auto-save toggle, auto-delete settings, clear history button
   - **Test Connection**: Validate OCR + translation keys

7. **Dark Glass Aesthetic UI**
   - Modern, minimal design
   - Dark theme optimized for reading
   - Consistent with contemporary translator apps

---

## 4. TECHNICAL SPECIFICATIONS SUMMARY

| Aspect | Specification |
|--------|---------------|
| **Framework** | Chrome Extension MV3 |
| **Frontend** | React 18.x + Vite |
| **Styling** | Tailwind CSS + CSS modules |
| **Storage** | chrome.storage.sync (encrypted) + IndexedDB |
| **OCR** | Google Cloud Vision API (BYOK) |
| **Translation** | Multiple LLM APIs (BYOK) |
| **Canvas Rendering** | HTML5 Canvas + OffscreenCanvas |
| **Language Detection** | francjs |
| **Build Tool** | Vite + web-ext |
| **Package Manager** | npm |
| **Node Version** | 18.x + |

---

## 5. DEVELOPMENT PHASES

### **Phase 1: Foundation (Week 1)**
- ✅ Extension boilerplate (manifest.json, content script setup)
- ✅ Floating icon detection & rendering
- ✅ Settings page infrastructure
- ✅ API key storage (chrome.storage.sync)

### **Phase 2: OCR Integration (Week 1-2)**
- ✅ Google Cloud Vision API integration
- ✅ Image capture from page
- ✅ OCR request/response handling
- ✅ Bounding box parsing

### **Phase 3: Translation Pipeline (Week 2)**
- ✅ LLM API handlers (Langbly, OpenRouter, OpenAI, etc.)
- ✅ Language detection (francjs)
- ✅ Translation request formatting
- ✅ Error handling + fallbacks

### **Phase 4: Canvas Rendering (Week 2-3)**
- ✅ HTML5 Canvas overlay system
- ✅ Text positioning algorithm (perfect fit priority)
- ✅ Font customization (family, size, color, stroke)
- ✅ Smart wrapping + overflow handling
- ✅ Download translated image

### **Phase 5: History & Storage (Week 3)**
- ✅ IndexedDB schema + CRUD operations
- ✅ History browsing UI
- ✅ Auto-save logic
- ✅ ZIP export functionality
- ✅ Auto-delete scheduling

### **Phase 6: Polish & Testing (Week 3-4)**
- ✅ Error states + user feedback
- ✅ Performance optimization
- ✅ Cross-browser testing (Chrome, Edge, Firefox)
- ✅ Multi-site compatibility testing
- ✅ Security review (API key handling)

---

## 6. DEPENDENCIES & LIBRARIES

### **Core**
- `react@^18.0.0` - UI framework
- `vite@^5.0.0` - Build tool
- `tailwindcss@^3.0.0` - Styling
- `zustand@^4.0.0` - State management

### **Content & Language**
- `franc@^6.0.0` - Language detection
- `axios@^1.0.0` - HTTP requests

### **Storage & Caching**
- `idb@^8.0.0` - IndexedDB wrapper
- Built-in `chrome.storage` API

### **Canvas & Rendering**
- Built-in `Canvas API` + `OffscreenCanvas`
- No external dependencies (keep lightweight)

### **Development**
- `web-ext@^7.0.0` - Extension testing
- `npm` scripts for build/test/package

---

## 7. DESIGN SYSTEM

### **Logo**
- **Name**: M Sparkle
- **Style**: Geometric, modern, minimalist
- **Color**: Slate blue (#4F63A8)
- **Accent**: Cream/off-white background
- **Usage**: Icon in all UI elements (16px, 48px, 128px variants)

### **Color Palette**
```css
--primary-bg: #1a1a24;           /* Dark background */
--primary-text: #e8e8e8;         /* Light text */
--accent-blue: #5b8cf5;          /* Interactive elements */
--accent-purple: #a855f7;        /* Secondary accent */
--success-green: #10b981;        /* Success states */
--error-red: #ef4444;            /* Error states */
--border-color: #333333;         /* Subtle borders */
```

### **Typography**
- **Primary Font**: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Manga Fonts**: WildWords, Heroika, Shonen, Komika Jam, Bangers (via Google Fonts)

### **Spacing & Layout**
- Base unit: 4px
- Padding: 8px, 12px, 16px, 24px
- Icon size: 16x16px (UI), 24x24px (floating)
- Max width (settings): 560px

---

## 8. SECURITY CONSIDERATIONS

1. **API Key Storage**
   - Store in `chrome.storage.sync` (Chrome-encrypted)
   - Never log or expose in console
   - Validate key format before storage
   - Add option to delete keys manually

2. **Content Security Policy (CSP)**
   - Restrict inline scripts
   - Allow only necessary external origins (Google Cloud, LLM endpoints)
   - No unsanitized HTML injection

3. **Image Handling**
   - No unauthorized image storage on remote servers
   - All images processed locally or sent only to configured APIs
   - User controls export/storage

4. **CORS & Cross-Origin**
   - Use `host_permissions` for target sites
   - Handle CORS errors gracefully
   - Fallback to user-configured APIs only

---

## 9. KNOWN CONSTRAINTS & LIMITATIONS

1. **Google Cloud Vision Quota**
   - Free tier: 1,000 images/month
   - Zayn's use case: ~50-200 images/month (safe)
   - Quota resets monthly
   - No paid tier upgrade in v1.0

2. **Canvas Text Overflow**
   - Long translations might not fit perfectly in original space
   - Strategy: Smart font sizing + wrapping
   - Worst case: User manually adjusts via font size slider

3. **Multi-Bubble Same Line**
   - Extension approach is better than Click to Do
   - Can handle granular text regions independently
   - No mixing of separate bubbles

4. **Site Compatibility**
   - v1.0: Generic image detection (all <img> tags)
   - Some sites might have aggressive content isolation
   - Site-specific optimizations in Phase 2

5. **Browser Support**
   - v1.0: Chrome, Edge (Chromium-based)
   - Firefox: Requires manifest adaptation (MV2 vs MV3)
   - Safari: Not targeted in v1.0

---

## 10. SUCCESS METRICS

1. **Functional**
   - ✅ Translates 90%+ of manga text correctly
   - ✅ Canvas overlay < 2s latency per image
   - ✅ History persists across browser sessions
   - ✅ Export ZIP generates without errors

2. **User Experience**
   - ✅ One-click activation on any manga site
   - ✅ Clear error messages for API failures
   - ✅ Responsive popup/settings UI
   - ✅ Smooth icon hover effects

3. **Performance**
   - ✅ OCR request: < 3s per image
   - ✅ Translation: < 2s per image
   - ✅ Total end-to-end: < 5s per image
   - ✅ Memory usage: < 50MB at rest

4. **Reliability**
   - ✅ No crashes on error states
   - ✅ Graceful API fallbacks
   - ✅ Data persistence without loss
   - ✅ No API key leaks in logs

---

## 11. FUTURE ROADMAP (Post v1.0)

- **Phase 2**: Site-specific optimizations (MangaDex, MangaPlus, Webtoon)
- **Phase 3**: Erase + Paint tools for manual editing
- **Phase 4**: Context sharing (character/terminology consistency)
- **Phase 5**: Firefox MV2 support
- **Phase 6**: Mobile app (companion to extension)
- **Phase 7**: Community feature sharing (shared translations)

---

## 12. FILE HANDOFF FOR DEVELOPMENT

**For Antigravity (AI Coder):**

Attach these files in order:
1. `/docs/00_master_plan.md` ← This file
2. `/docs/01_technical_specs.md` ← Detailed tech specs
3. `/docs/03_features/01_extension-shell.md` ← Start here (Phase 1)

**Per-session prompt template:**
```
Read the attached Mantra Extension PRD files.
We are implementing [FEATURE NAME].
Follow the technical specs in docs/01_technical_specs.md.
Build order: start with [PHASE].
Specific file: docs/03_features/[FEATURE_FILE].md

Use React + Vite + Tailwind.
Follow the design system in 02_design_guide.md.
Store keys in chrome.storage.sync.
Ensure no console.log of sensitive data.
```

---

## 13. QUICK REFERENCE

| Element | Value |
|---------|-------|
| **Product Name** | Mantra |
| **Tagline** | Manga Translator Extension |
| **Version** | 1.0 MVP |
| **Lead Developer** | Zayn |
| **Platform** | Browser Extension (Chrome MV3) |
| **Timeline** | 3-4 weeks |
| **Use Case** | Personal manga reading |
| **Cost to User** | Free (BYOK for APIs) |
| **Logo** | M Sparkle (Slate blue + cream) |
| **Theme** | Dark glass aesthetic |
| **History Limit** | 500 translations max |
| **OCR Provider** | Google Cloud Vision (BYOK) |
| **Translation Providers** | Langbly, OpenRouter, Gemini, OpenAI, Claude, DeepSeek (BYOK) |
| **Fonts** | WildWords, Heroika, Shonen, Komika Jam, Bangers |
| **Primary Language** | English (docs) |

---

**NEXT STEP:** Review `/docs/01_technical_specs.md` for detailed implementation architecture.
