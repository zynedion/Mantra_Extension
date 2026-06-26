# Feature 01: Extension Shell & Icon Injection
## Phase 1 - Foundation

**Objective:** Set up extension boilerplate, manifest, and floating icon detection system.

**Timeline:** 3-4 days  
**Dependencies:** Node.js 18+, npm  
**Acceptance Criteria:**
- ✅ Extension loads in Chrome without errors
- ✅ Floating "M" icon appears on all pages (semi-transparent)
- ✅ Icon hover shows full opacity
- ✅ Click icon opens popup
- ✅ Settings page accessible from popup

---

## 1. MANIFEST SETUP

### **File: manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Mantra - Manga Translator",
  "version": "1.0.0",
  "description": "Translate manga text in-place using Google Cloud Vision and AI translation",
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
      "resources": ["public/icons/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

## 2. PROJECT STRUCTURE

```
mantra-extension/
├── manifest.json
├── public/
│   ├── icons/
│   │   ├── icon-16.png
│   │   ├── icon-48.png
│   │   ├── icon-128.png
│   │   └── icon-256.png
│   ├── popup.html
│   └── options.html
├── src/
│   ├── background.js
│   ├── content-script.js
│   ├── popup.jsx
│   ├── options.jsx
│   ├── modules/
│   │   ├── storage.js
│   │   └── utils.js
│   └── styles/
│       ├── variables.css
│       ├── popup.css
│       ├── options.css
│       └── content.css
├── package.json
├── vite.config.js
├── tsconfig.json
└── .gitignore
```

---

## 3. CONTENT SCRIPT IMPLEMENTATION

### **File: src/content-script.js**

```javascript
/**
 * Content Script - Injected into every page
 * Responsible for:
 * - Detecting images
 * - Injecting floating icon
 * - Handling user interactions
 * - Rendering canvas overlays
 */

// ============ CONSTANTS ============
const FLOATING_ICON_ID = 'mantra-floating-icon';
const FLOATING_ICON_SIZE = 24; // pixels
const ICON_OPACITY_INACTIVE = 0.3;
const ICON_OPACITY_ACTIVE = 1.0;
const ICON_TRANSITION = '100ms ease';

// ============ STATE ============
let extensionEnabled = true;
let currentHoveredElement = null;

// ============ INITIALIZATION ============

/**
 * Initialize content script
 */
function init() {
  console.log('[Mantra] Content script initialized');
  
  // Load user preferences
  chrome.storage.sync.get('settings', (result) => {
    if (result.settings) {
      extensionEnabled = result.settings.enabledOnAllPages ?? true;
    }
    
    // Start image detection
    if (extensionEnabled) {
      detectImages();
      setupPageObserver();
    }
  });
  
  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener(handleMessage);
}

// ============ IMAGE DETECTION ============

/**
 * Detect all images on page and inject floating icons
 */
function detectImages() {
  console.log('[Mantra] Detecting images...');
  
  const images = document.querySelectorAll('img');
  console.log(`Found ${images.length} images`);
  
  images.forEach((img) => {
    // Skip if icon already exists
    if (img.dataset.mantraIconInjected) return;
    
    // Mark as processed
    img.dataset.mantraIconInjected = 'true';
    
    // Inject floating icon
    injectFloatingIcon(img);
  });
}

/**
 * Inject floating icon on image
 * @param {HTMLImageElement} imgElement
 */
function injectFloatingIcon(imgElement) {
  // Get image bounding rect
  const rect = imgElement.getBoundingClientRect();
  
  if (rect.width === 0 || rect.height === 0) {
    // Image not visible, skip
    return;
  }
  
  // Create icon wrapper
  const iconWrapper = document.createElement('div');
  iconWrapper.id = `${FLOATING_ICON_ID}-${Math.random().toString(36).substr(2, 9)}`;
  iconWrapper.className = 'mantra-floating-icon';
  iconWrapper.innerHTML = `
    <svg width="${FLOATING_ICON_SIZE}" height="${FLOATING_ICON_SIZE}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- M Sparkle Logo -->
      <path d="M6 8L12 4L18 8V16L12 20L6 16V8Z" fill="#4F63A8" opacity="1"/>
      <path d="M16 12L18 14L16 16L14 14L16 12Z" fill="#4F63A8" opacity="1"/>
    </svg>
  `;
  
  // Style icon
  Object.assign(iconWrapper.style, {
    position: 'fixed',
    top: `${rect.top + 12}px`,
    left: `${rect.left + 12}px`,
    width: `${FLOATING_ICON_SIZE}px`,
    height: `${FLOATING_ICON_SIZE}px`,
    cursor: 'pointer',
    zIndex: '9998',
    opacity: `${ICON_OPACITY_INACTIVE}`,
    transition: `all ${ICON_TRANSITION}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });
  
  // Append to body
  document.body.appendChild(iconWrapper);
  
  // Bind events
  iconWrapper.addEventListener('mouseenter', () => {
    iconWrapper.style.opacity = `${ICON_OPACITY_ACTIVE}`;
  });
  
  iconWrapper.addEventListener('mouseleave', () => {
    iconWrapper.style.opacity = `${ICON_OPACITY_INACTIVE}`;
  });
  
  iconWrapper.addEventListener('click', () => {
    handleIconClick(imgElement, iconWrapper);
  });
  
  // Store reference
  imgElement.dataset.mantraIcon = iconWrapper.id;
}

/**
 * Handle floating icon click
 * @param {HTMLImageElement} imgElement
 * @param {HTMLElement} iconElement
 */
async function handleIconClick(imgElement, iconElement) {
  console.log('[Mantra] Icon clicked', imgElement.src);
  
  // Show loading state
  iconElement.style.opacity = '1';
  iconElement.innerHTML = `
    <div class="mantra-loading-spinner"></div>
  `;
  
  try {
    // Capture image as blob
    const imageBlob = await captureImageAsBlob(imgElement);
    
    // Send to background for OCR
    chrome.runtime.sendMessage(
      {
        action: 'performOcr',
        imageData: imageBlob,
        imageUrl: imgElement.src
      },
      (response) => {
        if (response.success) {
          console.log('[Mantra] OCR successful', response.ocrResult);
          // Proceed to translation (Feature 03)
        } else {
          console.error('[Mantra] OCR failed', response.error);
          showToast(`OCR failed: ${response.error}`, 'error');
        }
        
        // Reset icon
        resetFloatingIcon(iconElement);
      }
    );
  } catch (error) {
    console.error('[Mantra] Error capturing image:', error);
    showToast('Failed to capture image', 'error');
    resetFloatingIcon(iconElement);
  }
}

/**
 * Capture image as blob
 * @param {HTMLImageElement} imgElement
 * @returns {Promise<Blob>}
 */
async function captureImageAsBlob(imgElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Wait for image to load
  if (!imgElement.complete) {
    await new Promise((resolve) => {
      imgElement.onload = resolve;
      imgElement.onerror = resolve;
    });
  }
  
  // Set canvas size
  canvas.width = imgElement.naturalWidth;
  canvas.height = imgElement.naturalHeight;
  
  // Draw image
  ctx.drawImage(imgElement, 0, 0);
  
  // Convert to blob
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.9);
  });
}

/**
 * Reset floating icon to default state
 * @param {HTMLElement} iconElement
 */
function resetFloatingIcon(iconElement) {
  iconElement.innerHTML = `
    <svg width="${FLOATING_ICON_SIZE}" height="${FLOATING_ICON_SIZE}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 8L12 4L18 8V16L12 20L6 16V8Z" fill="#4F63A8" opacity="1"/>
      <path d="M16 12L18 14L16 16L14 14L16 12Z" fill="#4F63A8" opacity="1"/>
    </svg>
  `;
  iconElement.style.opacity = `${ICON_OPACITY_INACTIVE}`;
}

// ============ PAGE OBSERVER ============

/**
 * Setup MutationObserver to detect new images added dynamically
 */
function setupPageObserver() {
  const observer = new MutationObserver((mutations) => {
    let imageAdded = false;
    
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'IMG') {
            injectFloatingIcon(node);
            imageAdded = true;
          } else if (node.querySelectorAll) {
            node.querySelectorAll('img:not([data-mantra-icon-injected])').forEach((img) => {
              injectFloatingIcon(img);
              imageAdded = true;
            });
          }
        });
      }
    });
    
    if (imageAdded) {
      console.log('[Mantra] New images detected and processed');
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// ============ MESSAGE HANDLER ============

/**
 * Handle messages from popup/background
 */
function handleMessage(request, sender, sendResponse) {
  console.log('[Mantra] Message received:', request.action);
  
  if (request.action === 'renderTranslation') {
    renderCanvasOverlay(request.imageElement, request.canvasData);
    sendResponse({success: true});
  } else if (request.action === 'toggleExtension') {
    extensionEnabled = request.enabled;
    if (extensionEnabled) {
      detectImages();
    }
    sendResponse({success: true});
  }
}

/**
 * Render canvas overlay on image
 * @param {Object} imageInfo - {selector, src}
 * @param {String} canvasDataUrl - Base64 canvas data
 */
function renderCanvasOverlay(imageInfo, canvasDataUrl) {
  console.log('[Mantra] Rendering canvas overlay');
  
  // Find original image (if still visible)
  let targetImg = document.querySelector(`img[src="${imageInfo.src}"]`);
  
  if (!targetImg) {
    console.warn('[Mantra] Original image not found, showing in new window');
    showTranslationWindow(canvasDataUrl);
    return;
  }
  
  // Create overlay container
  const overlay = document.createElement('img');
  overlay.src = canvasDataUrl;
  overlay.className = 'mantra-overlay-image';
  
  // Position absolutely over original image
  const rect = targetImg.getBoundingClientRect();
  Object.assign(overlay.style, {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex: '9999',
    cursor: 'pointer'
  });
  
  document.body.appendChild(overlay);
  
  // Click to dismiss
  overlay.addEventListener('click', () => {
    overlay.remove();
  });
  
  // Show success toast
  showToast('Translation complete! Click to dismiss.', 'success');
}

/**
 * Show translation in new modal window
 */
function showTranslationWindow(canvasDataUrl) {
  const modal = document.createElement('div');
  modal.className = 'mantra-modal';
  modal.innerHTML = `
    <div class="mantra-modal-content">
      <button class="mantra-modal-close">×</button>
      <img src="${canvasDataUrl}" style="max-width: 100%; max-height: 90vh; border-radius: 8px;"/>
      <div style="margin-top: 16px; display: flex; gap: 8px;">
        <button class="mantra-btn">Download</button>
        <button class="mantra-btn-secondary">Close</button>
      </div>
    </div>
  `;
  
  Object.assign(modal.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '10000'
  });
  
  document.body.appendChild(modal);
  
  modal.querySelector('.mantra-modal-close').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.querySelector('.mantra-btn-secondary').addEventListener('click', () => {
    modal.remove();
  });
}

// ============ UTILITIES ============

/**
 * Show toast notification
 * @param {String} message
 * @param {String} type - 'success', 'error', 'info'
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `mantra-toast mantra-toast-${type}`;
  toast.textContent = message;
  
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 16px',
    borderRadius: '6px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    zIndex: '10001',
    animation: 'slideIn 300ms ease'
  });
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 300ms ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============ START ============
init();
```

### **File: src/styles/content.css**

```css
/* Floating Icon */
.mantra-floating-icon {
  all: initial;
  position: fixed !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.mantra-floating-icon svg {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  transition: all 100ms ease;
}

.mantra-floating-icon:hover svg {
  transform: scale(1.1);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

/* Loading Spinner */
.mantra-loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(79, 99, 168, 0.2);
  border-top-color: #4f63a8;
  border-radius: 50%;
  animation: mantra-spin 1s linear infinite;
}

@keyframes mantra-spin {
  to { transform: rotate(360deg); }
}

/* Toast */
.mantra-toast {
  all: initial;
  display: block;
  padding: 12px 16px;
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  font-weight: 500;
  z-index: 10001;
}

.mantra-toast-success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid #10b981;
}

.mantra-toast-error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid #ef4444;
}

.mantra-toast-info {
  background: rgba(91, 140, 245, 0.1);
  color: #5b8cf5;
  border: 1px solid #5b8cf5;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(400px);
    opacity: 0;
  }
}

/* Modal */
.mantra-modal {
  all: initial;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.mantra-modal-content {
  background: #1a1a24;
  border-radius: 12px;
  padding: 24px;
  max-width: 90vw;
  max-height: 95vh;
  overflow: auto;
  position: relative;
}

.mantra-modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: #e8e8e8;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mantra-modal-close:hover {
  background: #2a2a35;
  border-radius: 4px;
}
```

---

## 4. BACKGROUND SERVICE WORKER

### **File: src/background.js**

```javascript
/**
 * Background Service Worker
 * Persistent service worker handling:
 * - Message routing
 * - Storage management
 * - API orchestration (to be implemented in next phases)
 */

console.log('[Mantra] Background service worker initialized');

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Mantra] Extension installed');
  
  // Initialize default settings
  chrome.storage.sync.get('settings', (result) => {
    if (!result.settings) {
      initializeDefaultSettings();
    }
  });
});

/**
 * Initialize default settings on first install
 */
function initializeDefaultSettings() {
  const defaultSettings = {
    enabledOnAllPages: true,
    targetLanguage: 'id',
    autoDetectLanguage: true,
    autoSave: true,
    autoDeleteAge: 'never',
    fontSize: 16,
    fontFamily: 'Fredoka One',
    fontColor: '#000000',
    strokeColor: '#ffffff',
    strokeSize: 2,
    textAlignment: 'center',
    lineSpacing: 100,
    letterSpacing: 0,
    borderRadius: 8,
    borderPadding: 4,
    theme: 'dark',
    iconOpacity: 0.3
  };
  
  chrome.storage.sync.set({settings: defaultSettings}, () => {
    console.log('[Mantra] Default settings initialized');
  });
}

/**
 * Handle messages from content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Mantra] Background received:', request.action);
  
  if (request.action === 'performOcr') {
    handleOcrRequest(request, sender, sendResponse);
  } else if (request.action === 'translateText') {
    handleTranslationRequest(request, sender, sendResponse);
  } else if (request.action === 'saveToHistory') {
    handleHistorySave(request, sender, sendResponse);
  } else if (request.action === 'getSetting') {
    handleGetSetting(request, sender, sendResponse);
  }
  
  // Return true to indicate async response
  return true;
});

/**
 * Handle OCR request (placeholder for Phase 2)
 */
function handleOcrRequest(request, sender, sendResponse) {
  console.log('[Mantra] OCR request received (Phase 2 implementation)');
  
  // Placeholder: OCR to be implemented in Phase 2
  sendResponse({
    success: false,
    error: 'OCR implementation in Phase 2'
  });
}

/**
 * Handle translation request (placeholder for Phase 3)
 */
function handleTranslationRequest(request, sender, sendResponse) {
  console.log('[Mantra] Translation request received (Phase 3 implementation)');
  
  // Placeholder
  sendResponse({
    success: false,
    error: 'Translation implementation in Phase 3'
  });
}

/**
 * Handle history save (placeholder for Phase 5)
 */
function handleHistorySave(request, sender, sendResponse) {
  console.log('[Mantra] History save request (Phase 5 implementation)');
  
  // Placeholder
  sendResponse({
    success: false,
    error: 'History implementation in Phase 5'
  });
}

/**
 * Handle get setting request
 */
function handleGetSetting(request, sender, sendResponse) {
  const { key } = request;
  
  chrome.storage.sync.get('settings', (result) => {
    if (result.settings && result.settings[key]) {
      sendResponse({
        success: true,
        value: result.settings[key]
      });
    } else {
      sendResponse({
        success: false,
        error: `Setting not found: ${key}`
      });
    }
  });
}
```

---

## 5. POPUP SKELETON

### **File: public/popup.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mantra</title>
  <link rel="stylesheet" href="../src/styles/variables.css">
  <link rel="stylesheet" href="../src/styles/popup.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="../src/popup.jsx"></script>
</body>
</html>
```

### **File: src/popup.jsx (Minimal for Phase 1)**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';

export default function Popup() {
  const [enabled, setEnabled] = React.useState(true);
  
  React.useEffect(() => {
    chrome.storage.sync.get('settings', (result) => {
      if (result.settings) {
        setEnabled(result.settings.enabledOnAllPages);
      }
    });
  }, []);
  
  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    
    chrome.storage.sync.set({
      settings: { enabledOnAllPages: newState }
    });
    
    // Notify content script
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'toggleExtension',
        enabled: newState
      });
    });
  };
  
  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };
  
  return (
    <div className="popup">
      <div className="popup-header">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M6 8L12 4L18 8V16L12 20L6 16V8Z" fill="#4F63A8"/>
          <path d="M16 12L18 14L16 16L14 14L16 12Z" fill="#4F63A8"/>
        </svg>
        <h1>Mantra</h1>
      </div>
      
      <div className="popup-content">
        <div className="setting-row">
          <label>Enable on this page</label>
          <button 
            className={`toggle ${enabled ? 'active' : ''}`}
            onClick={handleToggle}
          >
            <span className="knob"></span>
          </button>
        </div>
        
        <div className="recent-translations">
          <h2>Recent Translations</h2>
          <p className="muted">No translations yet</p>
        </div>
      </div>
      
      <div className="popup-footer">
        <button className="btn btn-secondary" onClick={openSettings}>
          Settings
        </button>
        <button className="btn btn-secondary">
          History
        </button>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Popup />);
```

### **File: src/styles/popup.css**

```css
:root {
  --bg-primary: #1a1a24;
  --bg-secondary: #2a2a35;
  --text-primary: #e8e8e8;
  --text-secondary: #a8a8a8;
  --accent-blue: #5b8cf5;
  --border-color: #404050;
}

* {
  box-sizing: border-box;
}

body {
  width: 280px;
  margin: 0;
  padding: 0;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
}

.popup {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.popup-header h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  flex: 1;
}

.popup-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.toggle {
  width: 44px;
  height: 24px;
  background: var(--border-color);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: background 200ms ease;
}

.toggle.active {
  background: var(--accent-blue);
}

.toggle .knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: left 200ms ease;
}

.toggle.active .knob {
  left: 22px;
}

.recent-translations {
  margin-bottom: 16px;
}

.recent-translations h2 {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
  text-transform: uppercase;
}

.muted {
  color: var(--text-secondary);
  font-size: 12px;
  margin: 0;
}

.popup-footer {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn:hover {
  border-color: var(--accent-blue);
  background: var(--bg-secondary);
}

.btn-secondary {
  background: var(--bg-secondary);
}
```

---

## 6. OPTIONS PAGE SKELETON

### **File: public/options.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mantra Settings</title>
  <link rel="stylesheet" href="../src/styles/variables.css">
  <link rel="stylesheet" href="../src/styles/options.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="../src/options.jsx"></script>
</body>
</html>
```

### **File: src/options.jsx (Minimal for Phase 1)**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';

export default function SettingsPage() {
  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Mantra Settings</h1>
      </div>
      
      <div className="settings-content">
        <div className="tab-nav">
          <button className="tab-btn active">API Keys</button>
          <button className="tab-btn">Translation</button>
          <button className="tab-btn">Appearance</button>
          <button className="tab-btn">History</button>
          <button className="tab-btn">About</button>
        </div>
        
        <div className="tab-content">
          <h2>API Keys Tab</h2>
          <p>API key configuration coming in Phase 1 (Feature 02)</p>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SettingsPage />);
```

### **File: src/styles/options.css**

```css
:root {
  --bg-primary: #1a1a24;
  --bg-secondary: #2a2a35;
  --text-primary: #e8e8e8;
  --text-secondary: #a8a8a8;
  --accent-blue: #5b8cf5;
  --border-color: #404050;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.settings-container {
  display: flex;
  min-height: 100vh;
}

.settings-header {
  padding: 24px;
  border-bottom: 1px solid var(--border-color);
}

.settings-header h1 {
  margin: 0;
  font-size: 24px;
}

.settings-content {
  display: flex;
  width: 100%;
}

.tab-nav {
  width: 160px;
  padding: 16px 0;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.tab-btn {
  padding: 12px 16px;
  background: none;
  border: none;
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  transition: all 150ms ease;
}

.tab-btn:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.tab-btn.active {
  color: var(--accent-blue);
  background: rgba(91, 140, 245, 0.1);
  border-left: 3px solid var(--accent-blue);
  padding-left: 13px;
}

.tab-content {
  flex: 1;
  padding: 24px;
  max-width: 560px;
}

.tab-content h2 {
  margin-top: 0;
}

.tab-content p {
  color: var(--text-secondary);
}
```

---

## 7. BUILD & PACKAGE SETUP

### **File: package.json**

```json
{
  "name": "mantra-extension",
  "version": "1.0.0",
  "description": "Manga Translator Extension",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src",
    "format": "prettier --write src",
    "test:extension": "web-ext run --source-dir=dist"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "franc": "^6.2.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "web-ext": "^7.9.0"
  }
}
```

### **File: vite.config.js**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'public/popup.html'),
        options: resolve(__dirname, 'public/options.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist'
  }
})
```

---

## 8. ACCEPTANCE TESTS

### **Test 1: Extension Loads**
```
Given: Chrome browser
When: Extension installed in chrome://extensions
Then: No errors in console
And: Extension appears in toolbar
```

### **Test 2: Floating Icon Appears**
```
Given: Extension installed and enabled
When: User navigates to any website with images
Then: Floating "M" icon appears on each image (top-left, 12px from edges)
And: Icon is semi-transparent (opacity 0.3)
```

### **Test 3: Icon Hover Effect**
```
Given: Floating icon visible on page
When: User hovers cursor over icon
Then: Icon opacity changes to 1.0
And: Icon slightly enlarges (1.05x scale)
And: Transition is smooth (150ms)
```

### **Test 4: Icon Click Shows Loading**
```
Given: User clicks floating icon
When: Image is being captured
Then: Icon shows spinning loader
And: Loader animates continuously
```

### **Test 5: Popup Opens**
```
Given: Extension toolbar icon clicked
When: Popup opens
Then: Popup displays correctly (280px × 400px)
And: Contains "Enable on this page" toggle
And: Shows "Settings" and "History" buttons
```

### **Test 6: Settings Page Opens**
```
Given: User clicks "Settings" button in popup
When: Settings page opens
Then: Page displays correctly (560px width)
And: Contains 5 tabs: API Keys, Translation, Appearance, History, About
And: All UI elements visible without overflow
```

### **Test 7: Page Observer Detects New Images**
```
Given: Extension is enabled on page
When: New images dynamically added to page (via JavaScript)
Then: Floating icons automatically appear on new images
And: No existing icons are duplicated
```

---

## 9. DELIVERABLES

Upon completion of Phase 1:

✅ Working extension boilerplate  
✅ Floating icon system with hover effects  
✅ Content script for image detection  
✅ Background service worker  
✅ Popup UI (minimal)  
✅ Settings page skeleton  
✅ Default settings initialization  
✅ Build pipeline configured  
✅ All acceptance tests passing  

**Next Phase:** Feature 02 - Settings Infrastructure & Storage Management
