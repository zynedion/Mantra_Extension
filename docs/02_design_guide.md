# Mantra Extension - Design Guide

**Version:** 1.0  
**Date:** June 26, 2026  

---

## 1. DESIGN SYSTEM OVERVIEW

### **Brand Identity**

**Product Name:** Mantra  
**Tagline:** Manga Translator Extension  
**Logo:** M Sparkle (Geometric, modern, minimalist)  

**Logo Specifications:**
- **Primary Color:** Slate Blue (#4F63A8)
- **Secondary Color:** Cream/Off-White (#F5F1E8)
- **Style:** Geometric with sparkle accent
- **Usage:** Icon in all UI elements, extension toolbar

**Logo Variants:**
- 16x16px (extension toolbar)
- 48x48px (popup header, settings)
- 128x128px (about page)

---

## 2. COLOR PALETTE

### **Primary Colors**
```css
--bg-primary: #1a1a24;           /* Dark background, all pages */
--bg-secondary: #2a2a35;         /* Elevated surfaces */
--bg-tertiary: #3a3a45;          /* Hover states, cards */
--text-primary: #e8e8e8;         /* Main text, high contrast */
--text-secondary: #a8a8a8;       /* Secondary text, muted */
--text-muted: #808080;           /* Disabled, subtle */
```

### **Accent Colors**
```css
--accent-blue: #5b8cf5;          /* Interactive elements, buttons, links */
--accent-purple: #a855f7;        /* Secondary accent, special states */
--success-green: #10b981;        /* Success messages, validation */
--error-red: #ef4444;            /* Errors, destructive actions */
--warning-amber: #f59e0b;        /* Warnings, caution states */
```

### **Border & Divider**
```css
--border-color: #404050;         /* Subtle borders, dividers */
--border-focus: #5b8cf5;         /* Focused input borders */
```

### **Opacity Scale**
```css
--opacity-hover: 1;              /* Icon hover (from 0.3)*/
--opacity-active: 0.9;           /* Active state */
--opacity-disabled: 0.5;         /* Disabled UI elements */
```

---

## 3. TYPOGRAPHY

### **Font Stack**
```css
--font-primary: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: "Roboto Mono", monospace;
```

### **Font Sizes**
```css
--text-xs: 11px;        /* Small labels */
--text-sm: 12px;        /* Input text, labels */
--text-base: 14px;      /* Body text, default */
--text-lg: 16px;        /* Large body, emphasis */
--text-xl: 18px;        /* Headings level 3 */
--text-2xl: 20px;       /* Headings level 2 */
--text-3xl: 24px;       /* Headings level 1, titles */
```

### **Font Weights**
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### **Line Height**
```css
--leading-tight: 1.2;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### **Manga-Specific Fonts** (Google Fonts)
```css
--font-manga-wildwords: "Fredoka One", sans-serif;
--font-manga-heroika: "Fredoka", sans-serif;
--font-manga-shonen: "Fredoka Mono", monospace;
--font-manga-komika: "Comfortaa", cursive;
--font-manga-bangers: "Bangers", cursive;
```

---

## 4. SPACING

### **Base Unit: 4px**
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

### **Component Padding**
- **Button:** 8px 16px (vertical × horizontal)
- **Input:** 8px 12px
- **Card:** 16px
- **Modal:** 24px
- **Page:** 16px (mobile), 24px (desktop)

### **Gaps**
- **Grid gap:** 12px
- **Stack gap (vertical):** 8px - 16px
- **Stack gap (horizontal):** 8px - 12px

---

## 5. COMPONENTS

### **5.1 Buttons**

**Primary Button**
```css
background: var(--accent-blue);
color: white;
padding: 8px 16px;
border-radius: 6px;
font-weight: 500;
cursor: pointer;

/* Hover */
background: #4a7be4;
opacity: 0.9;

/* Active */
background: #3a6bd4;

/* Disabled */
opacity: 0.5;
cursor: not-allowed;
```

**Secondary Button**
```css
background: var(--bg-tertiary);
color: var(--text-primary);
border: 1px solid var(--border-color);
padding: 8px 16px;
border-radius: 6px;

/* Hover */
background: var(--bg-secondary);
border-color: var(--accent-blue);
```

**Danger Button** (for destructive actions)
```css
background: var(--error-red);
color: white;
opacity: 0.8;

/* Hover */
opacity: 1;
```

### **5.2 Input Fields**

```css
/* Base */
border: 1px solid var(--border-color);
background: var(--bg-secondary);
color: var(--text-primary);
padding: 8px 12px;
border-radius: 6px;
font-size: var(--text-base);

/* Focus */
border-color: var(--border-focus);
outline: none;
box-shadow: 0 0 0 2px rgba(91, 140, 245, 0.1);

/* Disabled */
background: var(--bg-tertiary);
color: var(--text-muted);
cursor: not-allowed;
```

### **5.3 Toggle Switch**

```css
/* Off */
background: var(--border-color);
width: 44px;
height: 24px;
border-radius: 12px;

/* On */
background: var(--accent-blue);

/* Knob */
width: 20px;
height: 20px;
border-radius: 50%;
background: white;
position: absolute;
top: 2px;
left: 2px;
transition: left 200ms ease;
```

### **5.4 Slider**

```css
/* Track */
background: var(--bg-tertiary);
height: 4px;
border-radius: 2px;

/* Thumb */
width: 16px;
height: 16px;
background: var(--accent-blue);
border-radius: 50%;
cursor: pointer;
transition: all 150ms ease;

/* Hover thumb */
background: #4a7be4;
box-shadow: 0 0 0 3px rgba(91, 140, 245, 0.2);
```

### **5.5 Dropdown / Select**

```css
/* Container */
border: 1px solid var(--border-color);
background: var(--bg-secondary);
border-radius: 6px;
padding: 8px 12px;
color: var(--text-primary);
font-size: var(--text-base);

/* Focus */
border-color: var(--accent-blue);
```

### **5.6 Color Picker**

```css
/* Swatch */
width: 32px;
height: 32px;
border-radius: 4px;
border: 2px solid var(--border-color);
cursor: pointer;

/* Focus */
border-color: var(--accent-blue);
```

### **5.7 Cards**

```css
background: var(--bg-secondary);
border: 1px solid var(--border-color);
border-radius: 8px;
padding: 16px;

/* Hover (if interactive) */
border-color: var(--accent-blue);
background: var(--bg-tertiary);
```

### **5.8 Modal / Dialog**

```css
/* Backdrop */
background: rgba(0, 0, 0, 0.7);
position: fixed;
top: 0;
left: 0;
right: 0;
bottom: 0;

/* Content */
background: var(--bg-primary);
border-radius: 12px;
padding: 24px;
max-width: 560px;
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
```

---

## 6. UI LAYOUTS

### **6.1 Extension Popup (280px width)**

```
┌─────────────────────────────┐
│  [M Logo]    Mantra   [⚙️]   │  Header (32px height)
├─────────────────────────────┤
│                             │
│  [Toggle] Enable on page    │  Setting area (40px)
│                             │
├─────────────────────────────┤
│  Recent Translations:       │  Label
│  ┌────────┐ ┌────────┐     │
│  │ Thumb1 │ │ Thumb2 │ ... │  Gallery (3 thumbnails, 60px each)
│  └────────┘ └────────┘     │
│                             │
├─────────────────────────────┤
│  [Open Settings]  [History]│  Action buttons
│                             │
└─────────────────────────────┘
```

**Dimensions:** 280px × 400px  
**Padding:** 12px all sides  
**Gaps:** 12px (vertical)

### **6.2 Settings Page (560px width)**

```
┌─────────────────────────────────────────────────┐
│  [←] Settings                                [×] │
├──────────┬───────────────────────────────────────┤
│ API Keys │                                       │
│ Translation                                      │
│ Appearance                                       │
│ History                                          │
│ About                                            │
├──────────┴───────────────────────────────────────┤
│  [Settings Content Area - 400px wide]           │
│                                                  │
│  [Form Elements]                                 │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Overall:** 560px × 700px (approx)  
**Sidebar:** 160px (fixed)  
**Content:** 400px (fluid)  
**Padding:** 16px content area

### **6.3 History View (Gallery)**

```
┌─────────────────────────────────────────────────┐
│  Translation History                        [×] │
├─────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ 1    │  │ 2    │  │ 3    │  │ 4    │       │
│  │ orig │  │ orig │  │ orig │  │ orig │       │
│  └──────┘  └──────┘  └──────┘  └──────┘       │
│                                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐                  │
│  │ 5    │  │ 6    │  │ 7    │                  │
│  │ orig │  │ orig │  │ orig │                  │
│  └──────┘  └──────┘  └──────┘                  │
│                                                 │
│  [Load More]                        [Export ZIP]│
│  [Clear All]                                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Grid:** 4 columns × 2 rows (per page)  
**Thumbnail:** 100px × 120px  
**Gap:** 12px

---

## 7. INTERACTION PATTERNS

### **Floating Icon Behavior**

**Default State:**
- Position: Fixed, top-left corner (12px from edges)
- Size: 24px × 24px
- Opacity: 0.3
- Z-index: 9998 (below any tooltips)

**Hover State:**
```
- Opacity: 1.0
- Cursor: pointer
- Slight scale: 1.05x
- Transition: 150ms ease
```

**Click State:**
```
- Scale: 0.95x
- Opacity: 1.0
- Trigger: OCR on image
- Show: Loading spinner (2s max)
- Then: Toast notification (success/error)
```

### **Loading States**

```css
/* Spinner */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--bg-tertiary);
  border-top-color: var(--accent-blue);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
```

### **Error States**

```css
/* Error message */
background: rgba(239, 68, 68, 0.1);
color: var(--error-red);
border: 1px solid var(--error-red);
padding: 12px;
border-radius: 6px;
font-size: var(--text-sm);
```

**Examples:**
- "Invalid API key. Check settings."
- "Image too small to detect text."
- "Translation failed. Retry?"

### **Success States**

```css
/* Success message */
background: rgba(16, 185, 129, 0.1);
color: var(--success-green);
border: 1px solid var(--success-green);
```

**Examples:**
- "Translation saved to history."
- "API key validated."

---

## 8. RESPONSIVE DESIGN

### **Breakpoints**
```css
--mobile: 360px;
--tablet: 600px;
--desktop: 1024px;
```

**Note:** Extension popups are fixed width, so breakpoints mainly apply to settings page.

**Popup:** Always 280px wide (Chrome/Edge constraint)  
**Settings:** Fluid, but sidebar collapses on narrow screens

---

## 9. DARK MODE

All UI is dark mode by default. No light mode in v1.0.

**Rationale:**
- Reduces eye strain for long reading sessions
- Aligns with modern translator UX (Torii, Google Translate)
- Consistent with manga reading experience

---

## 10. ACCESSIBILITY

### **Contrast Ratios**
- Text vs background: 7:1 (WCAG AAA)
- Interactive elements: 4.5:1 minimum

### **Focus States**
```css
:focus {
  outline: 2px solid var(--accent-blue);
  outline-offset: 2px;
}
```

### **Keyboard Navigation**
- All interactive elements reachable via Tab
- Enter/Space to activate buttons
- Arrow keys for sliders
- Escape to close modals

### **Labels**
- All form inputs have associated `<label>` tags
- ARIA labels for icon-only buttons

### **Color Blindness**
- Don't rely solely on color (use icons + text)
- Use accessible color contrasts (checked with WCAG)

---

## 11. ANIMATION & TRANSITIONS

### **Duration Standards**
```css
--transition-fast: 100ms ease;
--transition-normal: 150ms ease;
--transition-slow: 300ms ease-out;
```

### **Easing Functions**
```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### **Common Transitions**
- Button hover: 150ms ease
- Icon opacity: 100ms ease
- Slider drag: Real-time (no delay)
- Modal enter: 300ms ease-out
- Tab switch: 200ms ease

**Principle:** Quick, responsive, not distracting

---

## 12. SPECIFIC UI SCREENS

### **Screen: Settings - API Keys Tab**

```
┌──────────────────────────────────┐
│ Google Cloud Vision API         │
│                                  │
│ [Input field: sk-...]           │  80px
│ [Test Connection button]        │
│ Status: ✓ Valid (tested Jun 26) │
│                                  │
├──────────────────────────────────┤
│ Translation Provider            │
│                                  │
│ [Dropdown: Langbly ▼]          │  40px
│                                  │
│ Langbly API Key                 │
│ [Input field: sk-...]           │  40px
│ [Test Connection button]        │
│ Status: ✓ Valid                 │
│                                  │
├──────────────────────────────────┤
│ Other Providers:                │
│                                  │
│ ☐ OpenRouter                    │
│ ☐ Google Gemini                 │
│ ☐ OpenAI                        │
│ ☐ Claude (Anthropic)            │
│ ☐ DeepSeek                      │
│                                  │
└──────────────────────────────────┘
```

### **Screen: Settings - Appearance Tab**

```
┌──────────────────────────────────┐
│ Font Family                     │
│ [WildWords ▼]                   │
│ Preview: "こんにちは"             │
│                                  │
├──────────────────────────────────┤
│ Font Size: 16px                 │
│ [─────●──────]  [↑ ↓]          │
│  6px           48px              │
│                                  │
├──────────────────────────────────┤
│ Font Color                      │
│ [■ Black]  [Picker]             │
│                                  │
│ Stroke Color                    │
│ [■ White]  [Picker]             │
│                                  │
│ Stroke Size: 2px                │
│ [──●────]                       │
│  0px   10px                      │
│                                  │
├──────────────────────────────────┤
│ Text Alignment                  │
│ [L] [C] [R] [J]                 │
│     ↑                            │
│   (Center selected)              │
│                                  │
│ Line Spacing: 100%              │
│ [───●──────]                    │
│  50%    200%                     │
│                                  │
├──────────────────────────────────┤
│ Theme: Dark ✓                   │
│                                  │
│ Icon Opacity: 0.3               │
│ [●───────────]                  │
│ 0.1        1.0                   │
│                                  │
└──────────────────────────────────┘
```

### **Screen: History - Export**

```
┌──────────────────────────────────┐
│ Export History as ZIP           │
│                                  │
│ Total translations: 47          │
│ Oldest: 3 weeks ago             │
│ Newest: Just now                │
│                                  │
│ [Export] [Cancel]               │
│                                  │
│ Exporting...                    │
│ ████████░░░░░░░ 60%             │
│                                  │
└──────────────────────────────────┘
```

---

## 13. NOTIFICATION SYSTEM

### **Toast Notifications**

**Position:** Bottom-right corner  
**Timeout:** 3s (error: 5s)  
**Max width:** 300px

**Success:**
```css
background: rgba(16, 185, 129, 0.1);
border: 1px solid var(--success-green);
color: var(--success-green);
```

**Error:**
```css
background: rgba(239, 68, 68, 0.1);
border: 1px solid var(--error-red);
color: var(--error-red);
```

**Info:**
```css
background: rgba(91, 140, 245, 0.1);
border: 1px solid var(--accent-blue);
color: var(--accent-blue);
```

**Examples:**
- "✓ Translation saved"
- "✗ API key invalid"
- "ⓘ Retrying translation..."

---

## 14. DESIGN FILES & ASSETS

**Logo Files:**
- `icon-16.png` (16×16px)
- `icon-48.png` (48×48px)
- `icon-128.png` (128×128px)
- `icon-256.png` (256×256px, for store)

**CSS Variables:**
- `/src/styles/variables.css` — All design tokens
- `/src/styles/components.css` — Reusable component styles
- `/src/styles/layout.css` — Layout utilities

**React Components:**
- `/src/components/Button.jsx`
- `/src/components/Input.jsx`
- `/src/components/Select.jsx`
- `/src/components/Toggle.jsx`
- `/src/components/Slider.jsx`
- `/src/components/Card.jsx`
- `/src/components/Toast.jsx`
- `/src/components/Spinner.jsx`

---

**NEXT STEP:** Review `/docs/03_features/` for detailed feature implementation specs.
