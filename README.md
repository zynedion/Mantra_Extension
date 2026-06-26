# Mantra Extension — Complete PRD

**Product:** Manga Translator Chrome Extension (MV3)
**Version:** 1.0 MVP
**Status:** ✅ FULL PRD COMPLETE — Ready for Implementation
**Timeline:** 3-4 weeks
**Last Updated:** June 26, 2026

---

## 📁 DOCUMENT MAP

```
mantra-extension-prd/
├── README.md                              ← You are here
├── DESIGN-BRIEF.md                        ← Standalone Claude Design handoff
└── docs/
    ├── 00_master_plan.md                  ← Product vision, features, roadmap
    ├── 01_technical_specs.md              ← Architecture, API contracts, algorithms
    ├── 02_design_guide.md                 ← UI tokens, components, layouts
    ├── 03_features/
    │   ├── 01_extension-shell.md          ← Phase 1: Manifest, content script, floating icon
    │   ├── 02_storage-infrastructure.md   ← Phase 2: Settings + IndexedDB + 5 settings tabs
    │   ├── 03_ocr-integration.md          ← Phase 3: Google Cloud Vision + image capture
    │   ├── 04_translation-pipeline.md     ← Phase 4: 6 LLM providers + lang detect + cache
    │   ├── 05_canvas-rendering.md         ← Phase 5: Perfect-positioning text overlay
    │   ├── 06_history-export.md           ← Phase 6: Gallery + ZIP export + auto-delete
    │   └── 07_polish-testing.md           ← Phase 7: Perf, errors, security, release
    └── 04_dev_log.md                      ← Decisions, risks, handoff prompt template
```

---

## 🚀 QUICK START

### For Zayn (Product Owner)
Read in this order (~40 min):
1. `README.md` (this file)
2. `docs/00_master_plan.md`
3. `docs/04_dev_log.md`

### For Antigravity (AI Implementer)
Per-phase workflow — read these 4 files, then implement:
1. `docs/00_master_plan.md` (context)
2. `docs/01_technical_specs.md` (architecture)
3. `docs/02_design_guide.md` (UI specs)
4. `docs/03_features/0N_<phase>.md` (current phase only)

### For Claude Design / Figma
Single self-contained file:
- `DESIGN-BRIEF.md` — has everything needed to design without reading the rest of the PRD

---

## 🎯 PROJECT AT A GLANCE

Mantra is a Chrome extension that translates manga text in-place:

1. Detects images on any page (generic, no site-specific code)
2. Floating "M" icon appears on each image (top-left, semi-transparent)
3. Click icon → image captured → Google Cloud Vision OCR
4. OCR regions → language detection → user's chosen LLM (1 of 6) → translations
5. Canvas overlay drawn directly on image with perfect positioning + manga fonts
6. Saved to local history (max 500, auto-delete configurable)
7. Exportable as structured ZIP with originals + translated + metadata

**Tech stack:** Chrome MV3, React 18, Vite, Tailwind, IndexedDB, chrome.storage.sync
**Cost to user:** Free (BYOK for all APIs)
**Privacy:** All data local, only outbound calls are to user's configured providers

---

## 📊 IMPLEMENTATION PHASES (ALL DOCUMENTED)

| # | Phase | Duration | Status | Spec file |
|---|-------|----------|--------|-----------|
| 1 | Extension Shell + Image Detection | 3-4 days | 📄 Spec ready | `03_features/01_extension-shell.md` |
| 2 | Storage Infrastructure + Settings UI | 2-3 days | 📄 Spec ready | `03_features/02_storage-infrastructure.md` |
| 3 | OCR Integration (Google Cloud Vision) | 3-4 days | 📄 Spec ready | `03_features/03_ocr-integration.md` |
| 4 | Translation Pipeline (6 LLM providers) | 3-4 days | 📄 Spec ready | `03_features/04_translation-pipeline.md` |
| 5 | Canvas Rendering (perfect positioning) | 4-5 days | 📄 Spec ready | `03_features/05_canvas-rendering.md` |
| 6 | History Gallery + ZIP Export | 2-3 days | 📄 Spec ready | `03_features/06_history-export.md` |
| 7 | Polish, Performance, Security, Release | 2-3 days | 📄 Spec ready | `03_features/07_polish-testing.md` |
| — | **TOTAL** | **~3-4 weeks** | ✅ READY | — |

Every phase includes:
- Code templates (production-ready, not pseudo-code)
- Acceptance criteria
- File-level deliverable list
- Acceptance test table (10-25 tests per phase)
- Error-handling spec

---

## 🔑 KEY DECISIONS (LOCKED)

| # | Decision | Choice | Why |
|---|----------|--------|-----|
| 1 | Platform | Chrome Extension MV3 | Avoids Click to Do multi-bubble issue from Electron attempt |
| 2 | OCR | Google Cloud Vision (BYOK, 1k/mo free) | Best accuracy, free tier covers personal use |
| 3 | Translation | 6 LLM providers (BYOK) | Langbly default + user choice |
| 4 | Storage | chrome.storage.sync + IndexedDB | Chrome auto-encrypts keys |
| 5 | Canvas strategy | Perfect positioning > perfect fit | Readability priority |
| 6 | Icon position | Top-left (Torii-style) | Standard, low interference |
| 7 | History limit | 500 entries max | Balance functionality + storage |
| 8 | Fonts | 5 manga fonts via Google Fonts | Free, lazy-loaded |
| 9 | Theme | Dark mode only (v1.0) | Manga-reading context |
| 10 | Logo | M Sparkle (slate blue #4F63A8) | Geometric, modern, recognizable |
| 11 | Multi-site strategy | Generic image detection | Works on any reader site |
| 12 | AI inpaint | Deferred to v2 | Out of scope for v1.0 |

Full rationale in `docs/04_dev_log.md`.

---

## 🎨 BRAND ESSENTIALS

- **Logo:** M Sparkle — slate blue (#4F63A8) on cream (#F5F1E8) for marketing; white on dark for in-app
- **Theme:** Dark only — `bg-primary: #1A1A24`
- **Accent:** `accent-blue: #5B8CF5`
- **Manga Fonts:** WildWords, Heroika, Shonen, Komika Jam, Bangers (all Google Fonts)
- **Feeling:** Quiet, precise, reader-first — "translator's tool, well-made"

Full design system in `docs/02_design_guide.md` and `DESIGN-BRIEF.md`.

---

## 🔐 SECURITY & PRIVACY

- API keys stored only in `chrome.storage.sync` (Chrome-encrypted)
- Never logged or exposed in console
- Outbound network requests **only** to user-configured providers
- No telemetry, no analytics, no remote config
- All data (history, cache, settings) stays local
- CSP enforced in manifest
- 12-item security checklist in Phase 7

---

## 📈 PERFORMANCE TARGETS

| Metric | Target | Acceptable |
|--------|--------|-----------|
| OCR roundtrip (cache miss) | < 2s | < 3s |
| Translation roundtrip (cache miss) | < 2s | < 4s |
| Canvas rendering | < 500ms | < 1s |
| **Total end-to-end (cache miss)** | **< 5s** | **< 7s** |
| Memory idle | < 30MB | < 50MB |
| Memory active translation | < 80MB | < 120MB |

---

## 🤖 HANDOFF PROMPT TEMPLATE (For Antigravity)

```
Read attached PRD files:
- docs/00_master_plan.md
- docs/01_technical_specs.md
- docs/02_design_guide.md
- docs/03_features/0N_<phase>.md  ← Replace N with current phase

Implement: <FEATURE NAME> (Phase N)

Stack: React 18 + Vite + Tailwind + Chrome MV3 + Zustand
Storage: chrome.storage.sync (settings, API keys) + IndexedDB (history, caches)
Never log API keys or sensitive data.

Deliverable: <see "Deliverables" section in the feature spec>
Acceptance: <see "Acceptance Tests" section in the feature spec>

Start with Phase 1 (docs/03_features/01_extension-shell.md).
Each phase unlocks the next — do not skip.
```

---

## ✅ ACCEPTANCE GATES

Each phase has its own acceptance gate. Before moving to the next phase:
- ✅ All acceptance tests in that phase pass
- ✅ No console errors in Chrome DevTools
- ✅ No regression in earlier phases
- ✅ Code committed with phase-tagged commit message (e.g. `feat(phase-2): storage layer + settings UI`)

Final v1.0 release gate (Phase 7):
- ✅ All 25 smoke tests pass
- ✅ All performance benchmarks within "Acceptable" column
- ✅ Security checklist 12/12 verified
- ✅ Tested on 4+ manga sites
- ✅ Chrome + Edge compatibility verified

---

## 📦 WHAT'S IN THE PRD

| File | Size | Description |
|------|------|-------------|
| `README.md` | ~10 KB | Navigation + quick start |
| `DESIGN-BRIEF.md` | ~28 KB | Standalone Figma handoff |
| `docs/00_master_plan.md` | ~14 KB | Vision, features, roadmap |
| `docs/01_technical_specs.md` | ~22 KB | Architecture + API integrations |
| `docs/02_design_guide.md` | ~19 KB | UI tokens, components, layouts |
| `docs/03_features/01_*.md` | ~30 KB | Phase 1 — extension shell |
| `docs/03_features/02_*.md` | ~22 KB | Phase 2 — storage + settings UI |
| `docs/03_features/03_*.md` | ~17 KB | Phase 3 — OCR integration |
| `docs/03_features/04_*.md` | ~22 KB | Phase 4 — translation pipeline |
| `docs/03_features/05_*.md` | ~22 KB | Phase 5 — canvas rendering |
| `docs/03_features/06_*.md` | ~19 KB | Phase 6 — history + ZIP |
| `docs/03_features/07_*.md` | ~18 KB | Phase 7 — polish + release |
| `docs/04_dev_log.md` | ~12 KB | Decisions, risks, handoff |

**Total:** ~255 KB of carefully-structured documentation. ~80,000 words. ~3,500 lines of production-ready code templates embedded.

---

## 🎉 STATUS: READY TO BUILD

The PRD is complete. Phases 1-7 are fully documented with code templates, acceptance tests, and deliverable lists. Hand `01_extension-shell.md` to Antigravity to begin Phase 1.

For design, hand `DESIGN-BRIEF.md` to Claude Design.

**Next action:** Begin Phase 1 implementation (estimated 3-4 days).
