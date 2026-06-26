# Mantra Extension — Design Brief
## Claude Design / Figma Handoff Document

**Product:** Mantra — Manga Translator Chrome Extension
**Designer Brief For:** Claude Design (Figma prototype)
**Source:** Solo developer Zayn, personal-use product
**Status:** Hi-fi design needed
**Date:** June 26, 2026

> **Note to designer:** This document is fully self-contained. You don't need to read the rest of the PRD to design the screens — everything you need is here: brand, palette, components, screens, states, and user flows.

---

## 1. WHAT IS MANTRA

Mantra is a personal-use Chrome extension that translates manga/comic text in-place. The reader hovers a small floating "M" icon over any manga image on any website, clicks once, and within a few seconds the original text is replaced by a translated overlay drawn directly on the image. It runs entirely client-side using user-provided API keys for OCR (Google Cloud Vision) and translation (their choice of 6 LLM providers).

**Persona:** A manga reader on a laptop, English/Indonesian speaker, who wants frictionless translation while reading. Comfortable getting an API key but not a developer. Reading sessions are 20-60 minutes, dark room, late evening.

**Design feeling:** Quiet, precise, slightly nerdy in a good way. Reader-first — the extension should disappear when not needed and feel surgical when used. Not playful, not corporate. Think "translator's tool, well-made," somewhere between Linear and a Japanese stationery brand.

---

## 2. BRAND IDENTITY

### **Logo: M Sparkle**

The logo is geometric, slate blue, with a four-point sparkle accent to the right of the M. The M is constructed from two parallelogram strokes — the right stroke is narrower, suggesting motion or fade. The sparkle is positioned at the lower right of the M.

**Logo colors:**
- Mark: Slate Blue `#4F63A8`
- Background (canvas around logo): Cream `#F5F1E8` — only used in the marketing/about page; the actual UI is dark

**Logo proportions:**
- Sparkle width ≈ 35% of M height
- Sparkle positioned at ~85% horizontal, ~70% vertical of M bounding box
- Logo aspect ratio: roughly 1.2:1 (slightly wider than tall)

**Logo usage rules:**
- Minimum size: 16×16 px (favicon/toolbar)
- Clear space: 25% of logo height on all sides
- Never recolor — slate blue only on light, or render in solid white on dark backgrounds
- The cream background is **marketing only**; in-app the logo sits on dark UI

**Logo asset (uploaded):** `/mnt/user-data/uploads/1782445316355_Gemini_Generated_Image_yp95y3yp95y3yp95.png`

---

## 3. COLOR SYSTEM

### **Dark Theme (primary, all in-app surfaces)**

| Token | Hex | Use |
|-------|-----|-----|
| `bg-primary` | `#1A1A24` | Main background, popup body, settings body |
| `bg-secondary` | `#2A2A35` | Elevated cards, header strips, input backgrounds |
| `bg-tertiary` | `#3A3A45` | Hover states, secondary elevations |
| `text-primary` | `#E8E8E8` | Body text, headings |
| `text-secondary` | `#A8A8A8` | Labels, captions, helper text |
| `text-muted` | `#808080` | Disabled, placeholder, very subtle metadata |
| `border-default` | `#404050` | Card borders, dividers, input borders |
| `border-focus` | `#5B8CF5` | Focused input borders |

### **Accent (sparingly)**

| Token | Hex | Use |
|-------|-----|-----|
| `accent-blue` | `#5B8CF5` | Primary action buttons, active tab, links, logo-on-dark |
| `accent-blue-hover` | `#4A7BE4` | Button hover |
| `accent-purple` | `#A855F7` | Secondary accent (use rarely — special states) |

### **Semantic**

| Token | Hex | Use |
|-------|-----|-----|
| `success` | `#10B981` | Success toasts, validated badges |
| `error` | `#EF4444` | Error toasts, destructive buttons, invalid badges |
| `warning` | `#F59E0B` | Warning toasts, quota near limit |

### **Brand**

| Token | Hex | Use |
|-------|-----|-----|
| `brand-slate` | `#4F63A8` | Logo mark, brand emphasis |
| `brand-cream` | `#F5F1E8` | About page background, marketing only |

**Light theme:** Not in v1.0. Dark only.

---

## 4. TYPOGRAPHY

### **System font stack (UI)**
```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
```

### **Type scale**

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `text-xs` | 11px | 500 | Small labels, badge text |
| `text-sm` | 12px | 500 | Helper text, captions |
| `text-base` | 14px | 400 | Body, inputs, default |
| `text-lg` | 16px | 500 | Section headings, emphasis |
| `text-xl` | 18px | 600 | Tab content headings (h2) |
| `text-2xl` | 20px | 600 | Page headings inside settings |
| `text-3xl` | 24px | 700 | Settings page title (h1) |

### **Line heights**
- Tight (headings): 1.2
- Normal (body): 1.5
- Relaxed (readable blocks): 1.75

### **Manga fonts (for the canvas overlay only — not UI)**

These five fonts are user-selectable for the translated text rendered on manga images. Show them as a preview swatch in the Appearance tab.

| Display name | Google Font | Vibe |
|--------------|-------------|------|
| WildWords | Fredoka One | Clean, modern, bold |
| Heroika | Fredoka | Impactful, friendly |
| Shonen | Fredoka Mono | Classic manga monospace feel |
| Komika Jam | Comfortaa | Playful, rounded |
| Bangers | Bangers | Comic/action, loud |

---

## 5. LAYOUT & SPACING

**Base unit:** 4px. Every spacing value should be a multiple of 4.

**Common spacings:** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48

**Component sizing:**
- Button height: 36px (medium), 28px (small)
- Input height: 36px
- Toggle: 44×24px (track), 20px (knob)
- Card padding: 16px
- Modal padding: 24px

**Fixed widths:**
- Popup window: 320px wide, ~440px tall
- Settings page: 720px wide content area (with 160px left sidebar = 880px total min)

**Border radius:**
- Small (badges, chips): 4px
- Medium (buttons, inputs): 6px
- Large (cards, modals): 8px
- XLarge (popup container): 12px

---

## 6. COMPONENT LIBRARY

### **6.1 Button**

Three variants, all 36px height by default:

**Primary** — `accent-blue` background, white text
```
[Test Connection]
```

**Secondary** — `bg-tertiary` background, `text-primary` text, 1px `border-default` border
```
[Cancel]
```

**Danger** — `error` background, white text, used for destructive actions
```
[Delete]
```

**Icon button** — 32×32px square, no label, used inline (e.g. show/hide password, delete entry)
```
[👁]  [🗑]
```

States: default / hover (slight bg darken) / active (slight bg darken more) / disabled (opacity 0.5, no pointer)

### **6.2 Input**

- 36px height
- 1px `border-default` border, 6px radius
- `bg-secondary` background
- Padding: 8px 12px
- Focus state: border becomes `accent-blue` + 2px outer glow `rgba(91, 140, 245, 0.1)`
- Placeholder: `text-muted` color

**Password-style input** (for API keys): adjacent eye icon button to toggle reveal. Default is hidden (`type=password`).

### **6.3 Select / Dropdown**

Same dimensions as Input. Native `<select>` styled to match. Chevron icon on the right.

### **6.4 Toggle**

44×24px track, 20px white knob with subtle shadow.
- OFF: `border-default` track, knob on left
- ON: `accent-blue` track, knob on right
- Transition: 200ms ease

### **6.5 Slider**

Track: 4px height, `bg-tertiary` color, full-width
Active fill: `accent-blue`, from left to thumb
Thumb: 16px circle, `accent-blue`, with 3px halo on hover (`rgba(91, 140, 245, 0.2)`)

Each slider has a header row with **label on left, current value on right** (e.g., "Font Size" — "16px").

### **6.6 Color Picker**

32×32 swatch with 2px `border-default`. Click opens native color picker. Adjacent hex input field (optional, advanced).

### **6.7 Card**

`bg-secondary` background, 1px `border-default` border, 8px radius, 16px padding. No shadow by default.
Interactive cards (history thumbnails) gain `accent-blue` border on hover.

### **6.8 Tab Navigation (Sidebar style for Settings)**

160px wide vertical column on the left of the settings page.
Each tab is a 36px-tall row, full-width, 16px left padding.
- Default: `text-secondary` color, no background
- Hover: `bg-secondary` background, `text-primary` color
- Active: `accent-blue` color, 3px-left-border `accent-blue`, slight blue-tinted background `rgba(91, 140, 245, 0.08)`

### **6.9 Toast Notification**

Position: bottom-right, 20px from edges. Stacks vertically when multiple.

Layout: padding 12px 16px, 6px radius, ~280-320px wide, max-width 360px.

Three semantic colors:
- **Success**: `success` border + transparent green tint (10% alpha)
- **Error**: `error` border + transparent red tint (10% alpha)
- **Info**: `accent-blue` border + transparent blue tint (10% alpha)

Optional inline action button (right side): underlined link-style in same semantic color.

Auto-dismiss: 3s (info/success), 5s (error). Hover pauses dismissal. Click action button executes and dismisses.

### **6.10 Modal**

Backdrop: `rgba(0, 0, 0, 0.7)` full-screen overlay
Content card: `bg-primary` background, 12px radius, 24px padding, max-width 720px, max-height 90vh
Close button: 32×32 icon button, top-right of modal header

### **6.11 Floating Translator Icon (THE star)**

This is the most visible component and the brand-defining UI element. It lives **on the web page itself**, not in the popup.

**Default state:**
- Position: top-left corner of every detected `<img>`, 12px inset from image top-left
- Size: 24×24px
- Logo: M Sparkle, white-tinted (use `#FFFFFF` for visibility on any image) with subtle drop shadow for legibility
- Opacity: 0.3 (semi-transparent — invisible until you look for it)
- Cursor: pointer

**Hover state:**
- Opacity: 1.0
- Scale: 1.1 (slightly enlarged)
- Drop shadow: deeper, more dramatic

**Loading state (during OCR/translation):**
- Replace M Sparkle with a spinning circle (24×24, 2px ring, `accent-blue` color on subtle dark ring)
- Opacity stays 1.0
- No hover effects during this state

**Transitions:** All state changes use 100-150ms ease curves.

---

## 7. SCREENS TO DESIGN

### **Screen 1: Popup (toolbar click)**

**Dimensions:** 320×440px

**Layout (top to bottom):**

1. **Header strip** (56px tall, `bg-secondary` background, 1px bottom border)
   - Logo (24×24, white-tinted version)
   - "Mantra" wordmark in 16px semibold
   - (No close button — popup auto-dismisses)

2. **Body** (16px padding all around, scrollable if content overflows)
   - **Enable toggle card**: full-width card with label "Enable on this page" + toggle on the right
   - **Section label**: "Recent Translations" in `text-secondary`, 12px uppercase, 8px below toggle card
   - **Thumbnail row**: 3 thumbnails in a row, each 88×104px, 6px gap. Square-ish cards showing the translated image, no labels. If fewer than 3, show what exists. If zero, show empty state text: "No translations yet."

3. **Footer strip** (52px tall, `bg-secondary` background, 1px top border, 12px padding)
   - Two secondary buttons side-by-side, equal width: `Settings` and `History`

**Empty state for recent translations:**
- Center-aligned text: "No translations yet" in `text-muted`
- Below: "Click the floating M icon on a manga image to start." in `text-secondary`, smaller
- Subtle illustration optional — a faded M sparkle icon at 64px size, 30% opacity

### **Screen 2: Settings — API Keys tab**

**Dimensions:** 880×680px (initial), resizable

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Mantra Settings                       [Reset Defaults]│  ← Header strip (64px, bg-secondary)
├──────────┬──────────────────────────────────────────────────┤
│ API Keys │  [Tab content, scrollable, 24px padding]         │
│ Translation                                                  │
│ Appearance                                                   │
│ History  │                                                  │
│ About    │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

**Tab content (API Keys):**

1. **Tab heading**: "API Keys" in 20px semibold

2. **Hint text** below heading: "Your keys are stored securely in Chrome and never sent to any server except the provider directly." in `text-secondary`, smaller text

3. **"Active Translation Provider" section** (separated by 32px from above):
   - Section heading "Active Translation Provider" in 16px semibold
   - Dropdown select (full width)
   - Helper text below: "This provider will be used for translation requests."

4. **"Provider Keys" section** (32px gap below):
   - Each provider gets its own row, separated by 16px gaps
   - **Each row structure**:
     - Top: Label on left (e.g., "Google Cloud Vision") + small "Required" badge if applicable + on the right: "Get Key ↗" link in `accent-blue` text
     - Middle: Password input + eye-toggle icon button (36px input height)
     - Bottom (only if key entered): Inline action row with `[Test Connection]` button + `[Remove]` button + small status text "✓ Valid (tested Jun 26)" in `success` color (or `✗ Invalid` in `error` color)

The 7 provider rows in order: Google Cloud Vision (required), Langbly, OpenRouter, Google Gemini, OpenAI, Anthropic Claude, DeepSeek.

### **Screen 3: Settings — Translation tab**

Simple form with 3 controls stacked vertically:

1. **Target Language dropdown** (full width, with helper "Translations will be rendered in this language.")
2. **Auto-detect toggle** (label + toggle on right, with helper "Use francjs library to detect source language automatically.")
3. **Fallback Source Language dropdown** (only visible if auto-detect ON, with helper)

Each control is a "setting-group" block with 24px gap between them.

### **Screen 4: Settings — Appearance tab**

This is the **densest** screen. Group related controls into visual blocks separated by 24px gaps.

**Block 1: Font** (heading "Font")
- Font Family dropdown
- **Font preview area**: 80px tall block with `bg-secondary` background, showing "The quick brown fox jumps" in the currently selected font at 32px

**Block 2: Size & Color**
- Font Size slider (6-48px)
- Font Color (label + 32×32 color swatch + hex value)
- Stroke Color (label + 32×32 color swatch + hex value)
- Stroke Size slider (0-10px)

**Block 3: Layout**
- Text Alignment — 3-button segmented control: `[Left] [Center] [Right]`
- Line Spacing slider (50-200%)
- Letter Spacing slider (-2 to 10px)
- Border Radius slider (0-20px)
- Border Padding slider (0-20px)

**Block 4: Floating Icon**
- Icon Opacity slider (0.1 to 1.0) with live mini-preview swatch at the right showing the M logo at current opacity

### **Screen 5: Settings — History tab**

**Layout:**

1. **Settings block (top)**: 24px below tab heading
   - Auto-save toggle row
   - Auto-delete dropdown row (with options: 1 day / 1 week / 1 month / Never)

2. **Stats card**: large card showing `<count>` in 36px bold blue + "translations stored (X% of 500 limit)" in body text

3. **Action row**: `[Export All as ZIP]` primary button + `[Clear All History]` danger button, side-by-side

4. **Browse History section** (heading "Browse History"):
   - **Gallery grid**: 4 columns × 3 rows (12 thumbnails per page), 12px gap
   - Each thumbnail: 140×160px card with translated image fitted, time label at the bottom-left ("2h ago"), small trash icon at top-right (only visible on hover)
   - **Pagination footer**: `← Previous` | "Page 1 of 4" | `Next →`

### **Screen 6: History — Detail Modal**

Triggered by clicking a thumbnail. Modal takes ~80% of viewport.

**Layout:**

1. **Modal header**: "Translation Details" h2 + close × button
2. **Body**:
   - **Image comparison row**: Two image panes side-by-side, equal width
     - Pane 1: "Original" heading + image fit-contained + "Download Original" button
     - Pane 2: "Translated" heading + image fit-contained + "Download Translated" button
   - **Metadata block**: heading "Metadata" + 2-column dl/dt/dd list (Created / Source / Languages / Model / Regions)
   - **Translations table**: heading "Translations" + 3-column table (# | Original | Translated)
3. **Modal footer**: `[Delete]` danger button on left + `[Close]` secondary button on right

### **Screen 7: Settings — About tab**

Center-aligned, simple:

1. Logo at 128×128
2. "Mantra" in 32px bold below
3. "Version 1.0.0" in `text-secondary`
4. Short description paragraph: "A personal manga translator extension built with care for readers who want frictionless translation."
5. Link row: `GitHub` | `Report Issue` (both in `accent-blue`)
6. Credits line at bottom in `text-muted`: "Built by Zayn. Powered by Google Cloud Vision and your chosen LLM provider."

---

## 8. IN-PAGE STATES (Content Script UI)

These appear on top of the actual manga page being read.

### **8.1 Floating M Icon**
See Component Library 6.11. Lives at top-left of every manga image, ~12px inset.

### **8.2 Loading Spinner (replaces M during processing)**
24×24, 2px ring spinner, `accent-blue` color on `bg-tertiary` track.

### **8.3 Toast Notifications**
See Component Library 6.9. Position: bottom-right of viewport, 20px from edges. Z-index above everything except modals.

**Typical toast contents:**
- ⓘ "No text detected in image"
- ✓ "Translated 5 regions. Rendering..."
- ✓ "Translation complete! Click overlay to dismiss."
- ✗ "Invalid Google Cloud API key" [Open Settings]
- ✗ "Quota exceeded. Try a different provider." [Switch Provider]

### **8.4 Translation Overlay**

The translated image, positioned absolutely over the original. Same dimensions and position. Click to dismiss, double-click to download. No additional UI chrome — the image speaks for itself.

---

## 9. USER FLOWS (to illustrate in Figma)

### **Flow A: First-time setup**
1. User installs extension → toolbar shows Mantra icon
2. User clicks toolbar icon → popup opens
3. User clicks "Settings" → settings page opens in new tab on API Keys
4. User enters Google Cloud Vision key → clicks Test → ✓ Valid badge appears
5. User enters Langbly key (or another) → clicks Test → ✓ Valid
6. User closes settings → returns to manga site
7. User clicks M icon on image → translation flow proceeds

### **Flow B: Standard translation**
1. User visits manga page → floating M icons appear on each image
2. User clicks M icon → icon turns to spinner
3. After 3-5s → translated overlay appears on top of original image
4. Success toast appears bottom-right
5. User reads translation
6. User clicks overlay → original visible again, no overlay
7. User scrolls down → next image has its own M icon → repeat

### **Flow C: Reviewing past translations**
1. User opens popup → sees 3 recent thumbnails
2. User clicks "History" → settings opens on History tab
3. User browses gallery → clicks a thumbnail
4. Detail modal opens → user reviews side-by-side
5. User clicks "Download Translated" → PNG saves
6. User closes modal → can navigate pages or filter (future)

### **Flow D: Exporting full history**
1. User opens settings → History tab
2. User clicks "Export All as ZIP"
3. Brief progress indicator while ZIP builds (1-3s typically)
4. ZIP downloads to default Downloads folder automatically (no save-as dialog)
5. Success toast: "Exported 47 translations to mantra-history-2026-06-26.zip"

### **Flow E: Error recovery (invalid API key)**
1. User clicks M icon
2. After ~1s, spinner stops
3. Error toast: "Invalid Google Cloud API key" with `[Open Settings]` action button
4. User clicks action → settings opens on API Keys tab
5. User updates key → clicks Test → ✓ Valid
6. User goes back to manga page → tries again → succeeds

---

## 10. INTERACTION & MOTION

**Principle:** Quick, responsive, not flashy. The extension should feel like a precision tool.

**Standard durations:**
- 100ms — icon hover, button state change
- 150ms — toggle, accordion expand
- 200-300ms — modal enter/exit, toast slide-in

**Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out) for most transitions.

**No-go's:**
- No bouncy/elastic motion
- No celebratory animations on success
- No skeleton loaders (just spinners — most ops are fast)
- No parallax or scroll-tied animations

---

## 11. ACCESSIBILITY

- All interactive elements reachable via Tab key
- Focus indicator: 2px `accent-blue` outline, 2px offset
- Color contrast: 7:1 for text (WCAG AAA target)
- Icon-only buttons have ARIA labels
- Toggle has `aria-pressed`
- Sliders have keyboard arrow support
- Toasts have ARIA live region for screen readers
- No reliance on color alone (icons + text in status indicators)

---

## 12. WHAT NOT TO DESIGN (out of scope)

- Onboarding tour / welcome flow (manual setup is fine for v1)
- Marketing landing page / Chrome Web Store listing (separate work)
- Mobile UI (extension is desktop-only)
- Light mode (dark only in v1)
- Custom icon picker for the floating icon (locked to M Sparkle)
- Per-site settings or whitelist UI (toggle is global)
- Account/auth screens (no accounts)
- Subscription/billing screens (BYOK only, free)

---

## 13. DELIVERABLES EXPECTED FROM CLAUDE DESIGN

After completing this brief, the designer should provide:

1. **Figma file** with at minimum:
   - Logo lockup variations (light/dark, with/without wordmark)
   - Component library (all components from section 6 as Figma components/variants)
   - 7 main screens (popup, 5 settings tabs, history detail modal)
   - 3-5 in-page state mockups (M icon on real manga page, loading state, toast examples, overlay applied)
   - 1-2 user-flow diagrams referencing the flows in section 9

2. **Exported assets**:
   - Logo PNG at 16, 32, 48, 128, 256, 512 px
   - Logo SVG (single-color, vector)
   - Favicon (16×16 ICO if possible)

3. **Design tokens** documented (color/spacing/typography tokens as a list — already provided in this brief, can be confirmed or refined)

4. **Style sheet** of the 3-5 most representative screens (color callouts, spacing annotations) for handoff to dev

---

## 14. INSPIRATION REFERENCES

- **Torii Translate** (https://toriitranslate.com) — competitor; designer can learn from but don't copy. We are quieter, more precise.
- **Linear** — sidebar pattern, density, typography
- **Anthropic Claude.ai** — dark UI, restraint, subtle accent use
- **Raycast** — toast pattern, icon button density
- **Figma's own settings UI** — tab layout reference

Avoid:
- Notion (too friendly/cute for this product)
- Discord (too gamified)
- Crunchyroll/manga sites (too cluttered)

---

## 15. PRIORITY ORDER FOR DESIGN

If time-boxed:

**Must-have:**
1. Floating M icon (states: default / hover / loading)
2. Popup (320×440)
3. Settings — API Keys tab (most complex form)
4. Toast notifications (success/error/info variants)
5. Logo lockup (light + dark)

**Should-have:**
6. Settings — Appearance tab (slider-heavy)
7. Settings — History tab + gallery
8. History detail modal
9. Settings — Translation tab
10. Settings — About tab

**Nice-to-have:**
11. Empty states with illustration
12. Hover states for thumbnails
13. Animated transitions (Figma prototype mode)
14. Mockups on real manga page backgrounds

---

## 16. OPEN QUESTIONS FOR DESIGNER

These are explicitly **flexible** — designer's judgment requested:

- **Sparkle alternative placements:** The M Sparkle has the sparkle to the right. Should the icon ever appear without the sparkle in very tiny sizes (16px favicon)? Or always with?
- **Empty-state illustrations:** A faded logo at 30% opacity is suggested, but a small custom illustration (e.g., a manga panel with a soft glow) would also work. Designer's call.
- **Font preview in settings:** Currently spec'd as "The quick brown fox jumps" — could use Japanese sample text too (こんにちは, 元気ですか?) since this is a manga translator. Designer's call.
- **History thumbnail aspect ratio:** Spec'd as 140×160 (slight portrait). Could also be square or 4:5. Whatever feels natural with manga aspect ratios.
- **Settings sidebar icons:** Currently spec'd as text-only tabs. Adding small icons next to each label (🔑 API Keys, 🌐 Translation, etc.) is optional. If using, keep icons monochrome and subtle.

---

## 17. CONTACT & ITERATION

**Product owner:** Zayn
**Iteration cadence:** Designer delivers v1 of all priority screens → Zayn reviews → 1-2 revision rounds → final handoff
**Handoff to dev:** Once approved, dev implements per the existing PRD (this is the design layer on top of the technical PRD).

---

**End of Design Brief**

*Everything you need to design Mantra is in this document. Pair with the M Sparkle logo asset for the final piece. Good luck — make it quiet and precise.* 🎨
