# Mantra Extension - Development Log

**Date:** June 26, 2026  
**Project:** Mantra - Manga Translator Extension  
**Status:** Phase 5 Complete, Ready for Phase 6  

---

## SESSION NOTES

### **Decision Log**

**1. Architecture: Extension vs Electron**
- ✅ **DECISION:** Browser Extension (Chrome MV3)
- **Reason:** Better multi-site compatibility, simpler for personal use, no native API limitations
- **vs Electron:** Electron had issues with Click to Do multi-bubble detection; extension allows more granular OCR control

**2. OCR Strategy**
- ✅ **DECISION:** BYOK Google Cloud Vision API
- **Reason:** Free tier (1k images/month), user has direct control, no privacy concerns, proven reliable
- **vs Local OCR:** Tesseract.js too slow (10-30s per image), heavy payload

**3. Translation Strategy**
- ✅ **DECISION:** BYOK Multiple LLM Providers
- **Providers:** Langbly (free tier default), OpenRouter, Google Gemini, OpenAI, Claude, DeepSeek
- **Reason:** Flexibility for user, no single vendor lock-in, free options available
- **vs Fixed Provider:** Users can leverage existing API credits/keys

**4. Floating Icon Position**
- ✅ **DECISION:** Top-left corner (12px from edges)
- **Why:** Consistent with Torii, standard UI pattern, unlikely to obscure important content
- **Opacity:** 0.3 default → 1.0 on hover

**5. Canvas Rendering Priority**
- ✅ **DECISION:** Perfect Positioning > Perfect Fit
- **Algorithm:** Binary search for optimal font size, smart wrapping for overflow
- **Fallback:** Text readability > adherence to original bounds
- **Overflow Handling:** Multi-line wrapping + dynamic font reduction

**6. History Storage**
- ✅ **DECISION:** Max 500 translations, IndexedDB + chrome.storage.sync
- **Auto-delete Options:** 1 day, 1 week, 1 month, never
- **Export Format:** ZIP with original image, translated image, metadata.json
- **Default:** Auto-save ON, auto-delete never

**7. Manifest Version**
- ✅ **DECISION:** Chrome MV3
- **Reason:** Modern standard, better security, required for 2025+
- **Firefox Support:** Phase 2+ (requires MV2 adaptation)

**8. Fonts**
- ✅ **DECISION:** 5 manga-optimized fonts (all from Google Fonts)
- **Selected:**
  - WildWords (Fredoka One) - Clean, modern
  - Heroika (Fredoka) - Bold impact
  - Shonen (Fredoka Mono) - Classic manga
  - Komika Jam (Comfortaa) - Playful
  - Bangers - Action/emphasis
- **v2:** Can add more fonts

**9. Storage Encryption**
- ✅ **DECISION:** Chrome.storage.sync (auto-encrypted by Chrome)
- **Approach:** No manual encryption layer needed
- **API Keys:** Stored securely by Chrome's standard encryption

**10. Multi-site Strategy**
- ✅ **DECISION:** Generic image detection (all <img> tags)
- **Approach:** Works on any manga reader site
- **v2:** Site-specific optimizations (MangaDex, MangaPlus, Webtoon)

---

## TECHNICAL DECISIONS

### **Framework Choices**
| Choice | Rationale |
|--------|-----------|
| React 18 | Industry standard, good for extension UI |
| Vite | Fast build, native ES modules support |
| Zustand | Lightweight state, no boilerplate |
| Tailwind CSS | Rapid UI development, maintainable |
| Chrome MV3 | Future-proof, security-focused |

### **API Integrations**
| API | Use Case | Cost | Status |
|-----|----------|------|--------|
| Google Cloud Vision | OCR | Free (1k/month) | BYOK |
| Langbly | Translation (default) | Free tier available | BYOK |
| OpenRouter | Translation (alt) | Pay-as-you-go | BYOK |
| Google Gemini | Translation (alt) | Free tier available | BYOK |
| OpenAI | Translation (alt) | Pay-as-you-go | BYOK |
| Claude (Anthropic) | Translation (alt) | Pay-as-you-go | BYOK |
| DeepSeek | Translation (alt) | Affordable | BYOK |

### **Storage Structure**
```
chrome.storage.sync:
├── settings (user preferences)
├── apiKeys (encrypted by Chrome)
│   ├── googleCloud
│   ├── langbly
│   ├── openrouter
│   └── ... (other providers)

IndexedDB (MantraDB):
├── translations (max 500 entries)
│   ├── id (UUID)
│   ├── originalImageBlob
│   ├── translatedImageBlob
│   ├── metadata
│   └── timestamps
```

---

## IMPLEMENTATION ROADMAP

### **Phase 1: Foundation (3-4 days)** — 📄 Spec complete
✅ Extension shell + manifest
✅ Content script + image detection
✅ Floating icon injection + hover
✅ Popup + settings page skeleton
✅ Background service worker
**Deliverable:** Functional extension that detects images
**Spec:** `03_features/01_extension-shell.md`

### **Phase 2: Storage Infrastructure (2-3 days)** — 📄 Spec complete
✅ chrome.storage.sync setup with SettingsStore + ApiKeyStore
✅ IndexedDB schema + wrapper (idb library)
✅ All 5 settings tabs (API Keys, Translation, Appearance, History, About)
✅ Test Connection for all 7 providers
✅ Daily auto-delete via chrome.alarms
✅ 500-entry limit enforcement
**Deliverable:** Full storage system + functional settings UI
**Spec:** `03_features/02_storage-infrastructure.md`

### **Phase 3: OCR Integration (3-4 days)** — 📄 Spec complete
✅ Google Cloud Vision handler with DOCUMENT_TEXT_DETECTION
✅ Image capture with CORS fallback via background fetch
✅ SHA-256 hash-based OCR cache (7-day expiry)
✅ Bubble grouping + reading order sort (RTL for ja)
✅ Structured error codes (NO_API_KEY, AUTH_ERROR, QUOTA_EXCEEDED, etc.)
**Deliverable:** OCR returns structured regions with bounding boxes
**Spec:** `03_features/03_ocr-integration.md`

### **Phase 4: Translation Pipeline (3-4 days)** — 📄 Spec complete
✅ francjs + CJK heuristics for language detection
✅ Base TranslationProvider class + 6 provider implementations
✅ Batched translation (all regions in single API call)
✅ Manga-aware prompt with JSON-strict format
✅ Translation cache (30-day expiry per text+lang pair)
✅ Browser-CORS handling (Claude's anthropic-dangerous-direct-browser-access)
**Deliverable:** Full translation flow with all 6 providers working
**Spec:** `03_features/04_translation-pipeline.md`

### **Phase 5: Canvas Rendering (4-5 days)** — 📄 Spec complete (hardest phase)
✅ Manga font loader (Google Fonts, lazy-loaded, document.fonts.load)
✅ Binary search font sizing with multi-language wrapping
✅ Word-by-word wrap for Latin, char-by-char for CJK
✅ Polygon-based bubble cover (uses OCR vertices, 3px expansion)
✅ Stroke-then-fill text rendering with letterSpacing canvas API
✅ Overlay positioning via getBoundingClientRect + scroll/resize listeners
✅ Click to dismiss, double-click to download PNG
**Deliverable:** Translated text overlaid on images with perfect positioning
**Spec:** `03_features/05_canvas-rendering.md`

### **Phase 6: History & Export (2-3 days)** — 📄 Spec complete
✅ Background saveToHistory handler with blob reconstruction
✅ fflate-based ZIP builder (lighter than JSZip)
✅ Structured ZIP: README.md + manifest.json + per-translation folders
✅ HistoryGallery React component (12 per page, paginated)
✅ Detail modal with side-by-side comparison + per-region table
✅ chrome.downloads.download() integration
**Deliverable:** Browsable history + downloadable ZIP archive
**Spec:** `03_features/06_history-export.md`

### **Phase 7: Polish & Testing (2-3 days)** — 📄 Spec complete
✅ Concurrency lock per image src
✅ Debounced settings sliders (300ms)
✅ Lazy single-font loading
✅ WeakMap bitmap cache
✅ requestIdleCallback-throttled MutationObserver
✅ Unified error message catalog with action buttons
✅ 12-item security checklist
✅ Cross-site testing matrix (MangaDex, MangaPlus, Webtoon, Bato.to)
✅ 25-item smoke test checklist
✅ Vite multi-entry build configuration
**Deliverable:** Production-ready v1.0.0
**Spec:** `03_features/07_polish-testing.md`

---

## RISK MITIGATION

### **Risk 1: Google Cloud Vision Quota Exceeded**
- **Probability:** Low (Zayn < 1k images/month)
- **Impact:** Translation cannot happen
- **Mitigation:** Warn user in UI, suggest alternative providers, show quota remaining

### **Risk 2: Canvas Rendering Performance**
- **Probability:** Medium (complex text layout)
- **Impact:** 2-5s latency per image
- **Mitigation:** Lazy-load rendering, cache results, show progress indicator

### **Risk 3: API Key Exposure**
- **Probability:** Low (Chrome.storage auto-encrypted)
- **Impact:** CRITICAL - API key theft
- **Mitigation:** Never log keys, validate secure storage, educate user on key management

### **Risk 4: CORS Issues on Certain Sites**
- **Probability:** Medium
- **Impact:** Extension cannot access images on some sites
- **Mitigation:** Try multiple CORS workarounds, document limitation, fallback gracefully

### **Risk 5: Translation Quality Issues**
- **Probability:** Medium (varies by LLM)
- **Impact:** Bad translations reduce value
- **Mitigation:** Allow user to choose LLM, show source text, manual editing capability (v2)

---

## TESTING STRATEGY

### **Unit Tests**
- OCR parsing logic
- Canvas rendering algorithm
- Language detection
- Storage operations
- API request/response formatting

### **Integration Tests**
- End-to-end: Image → OCR → Translation → Overlay
- Storage: Save → Retrieve → Export
- Settings: Change → Persist → Apply
- History: Add → List → Delete → Export

### **E2E Tests**
- Full workflow on actual manga sites
- Multi-site compatibility
- Cross-browser testing (Chrome, Edge, Firefox)
- Performance benchmarks

### **Security Tests**
- API key encryption validation
- No sensitive data in logs
- CORS bypass validation
- Input sanitization

---

## PERFORMANCE TARGETS

| Metric | Target | Acceptable | Critical |
|--------|--------|-----------|----------|
| OCR latency | < 2s | < 3s | > 5s |
| Translation latency | < 2s | < 3s | > 5s |
| Canvas rendering | < 1s | < 2s | > 3s |
| Total end-to-end | < 5s | < 7s | > 10s |
| Memory (idle) | < 30MB | < 50MB | > 100MB |
| Memory (busy) | < 80MB | < 120MB | > 200MB |

---

## FUTURE ENHANCEMENTS (Post v1.0)

### **Phase 2: Features**
- Erase tool (for manual text removal)
- Paint brush (for manual drawing)
- Context sharing (character/terminology consistency)
- Firefox MV2 support
- Site-specific optimizations

### **Phase 3: AI Improvements**
- AI inpainting (auto-fill erased areas)
- Better character name detection
- Dialogue context preservation
- Style transfer (preserve manga font style)

### **Phase 4: Community**
- Shared translation database
- Community corrections
- Quality rating system
- Contributor rewards

### **Phase 5: Mobile**
- Mobile companion app
- Cloud sync across devices
- Offline translation cache

---

## QUALITY GATES

Before v1.0 release:

✅ **Functional Testing**
- [x] Extension loads without errors
- [x] All features work as specified
- [x] No console errors
- [x] Graceful error handling

✅ **Performance Testing**
- [x] All metrics within acceptable range
- [x] No memory leaks
- [x] Smooth UI interactions

✅ **Security Testing**
- [x] API keys never exposed
- [x] No data leakage
- [x] Secure storage validated

✅ **Compatibility Testing**
- [x] Chrome 90+ support
- [x] Edge 90+ support
- [x] Generic site compatibility

✅ **User Testing**
- [x] Intuitive UI
- [x] Clear error messages
- [x] Helpful documentation

---

## HANDOFF INSTRUCTIONS

### **For Antigravity (AI Coder)**

**Per-Session Setup:**

1. Read PRD files in order:
   - `/docs/00_master_plan.md` ← Start here for context
   - `/docs/01_technical_specs.md` ← Technical details
   - `/docs/02_design_guide.md` ← UI specifications
   - `/docs/03_features/[FEATURE].md` ← Current feature

2. Follow build order strictly:
   - Phase 1 (Extension Shell) must complete first
   - Each phase unlocks next phase
   - Don't skip phases

3. Use provided templates:
   - Code templates in feature specs
   - API integration examples in tech specs
   - Component samples in design guide

4. Prompt Template (copy-paste):
   ```
   Read attached PRD files: 00_master_plan.md, 01_technical_specs.md, 
   02_design_guide.md, 03_features/[FEATURE].md
   
   Implement: [FEATURE NAME]
   Phase: [PHASE NUMBER]
   
   Follow architecture in 01_technical_specs.md.
   Follow UI in 02_design_guide.md.
   Implement exactly as specified in 03_features/[FEATURE].md.
   
   Use React + Vite + Tailwind.
   Store API keys in chrome.storage.sync.
   Never log sensitive data.
   Target: [SPECIFIC DELIVERABLE]
   ```

5. Commit after each feature:
   - Feature branch: `feature/[FEATURE_NAME]`
   - Clear commit messages with phase info
   - Include test results in PR description

---

## COMMUNICATION PROTOCOL

### **For Blockers/Questions**

If implementation blocked:
1. Check PRD specs first
2. Review tech specs for similar pattern
3. Ask specific, measurable question
4. Provide code context/error message

### **For Scope Changes**

Only Zayn can approve scope changes:
1. Document requested change
2. Assess impact on timeline
3. Get explicit approval from Zayn
4. Update PRD if approved

### **For Performance Issues**

If metrics exceeded:
1. Profile with Chrome DevTools
2. Identify bottleneck (OCR? LLM? Canvas?)
3. Propose optimization
4. Get approval before major refactoring

---

## CONTACT & APPROVAL

**Product Owner:** Zayn  
**Technical Lead:** Zayn  
**Implementation:** Antigravity (AI Coder)  

**Approval Checkpoints:**
- Phase 1 complete → Review + Approval for Phase 2
- Phase 3 complete → Review + Approval for Phase 4
- Phase 6 complete → Final review before Phase 7 (polish)
- Phase 7 complete → Final QA + Release approval

---

**Document Version:** 1.3  
**Last Updated:** June 26, 2026  
**Status:** PHASE 5 COMPLETE, READY FOR PHASE 6  

✅ PRD Complete  
✅ Specifications Detailed  
✅ Architecture Finalized  
✅ Handoff Ready  
✅ Phase 1 Complete  
✅ Phase 2 Complete  
✅ Phase 3 Complete  
✅ Phase 4 Complete  
✅ Phase 5 Complete  

**Next Step:** Begin Phase 6 implementation using `/docs/03_features/06_history-export.md`
