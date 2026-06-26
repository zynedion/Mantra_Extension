const FLOATING_ICON_ID = 'mantra-floating-icon';
const FLOATING_ICON_SIZE = 24;
const ICON_OPACITY_INACTIVE = 0.3;
const ICON_OPACITY_ACTIVE = 1.0;
const ICON_TRANSITION = '100ms ease';

let extensionEnabled = true;

function init() {
  chrome.storage.sync.get('settings', (result) => {
    if (result && result.settings) {
      extensionEnabled = result.settings.enabledOnAllPages ?? true;
    }
    if (extensionEnabled) {
      detectImages();
      setupPageObserver();
    }
  });

  chrome.runtime.onMessage.addListener(handleMessage);
}

function detectImages() {
  const images = document.querySelectorAll('img');
  images.forEach((img) => {
    if (img.dataset.mantraIconInjected) return;
    img.dataset.mantraIconInjected = 'true';
    injectFloatingIcon(img);
  });
}

function injectFloatingIcon(imgElement) {
  const rect = imgElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const iconWrapper = document.createElement('div');
  iconWrapper.id = `${FLOATING_ICON_ID}-${Math.random().toString(36).substr(2, 9)}`;
  iconWrapper.className = 'mantra-floating-icon';
  iconWrapper.innerHTML = `
    <svg width="${FLOATING_ICON_SIZE}" height="${FLOATING_ICON_SIZE}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 8L12 4L18 8V16L12 20L6 16V8Z" fill="#4F63A8"/>
      <path d="M16 12L18 14L16 16L14 14L16 12Z" fill="#4F63A8"/>
    </svg>
  `;

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

  document.body.appendChild(iconWrapper);

  iconWrapper.addEventListener('mouseenter', () => {
    iconWrapper.style.opacity = `${ICON_OPACITY_ACTIVE}`;
  });
  iconWrapper.addEventListener('mouseleave', () => {
    iconWrapper.style.opacity = `${ICON_OPACITY_INACTIVE}`;
  });
  iconWrapper.addEventListener('click', () => {
    handleIconClick(imgElement, iconWrapper);
  });

  imgElement.dataset.mantraIcon = iconWrapper.id;
}

function showIconLoading(iconElement) {
  iconElement.style.opacity = '1';
  iconElement.innerHTML = `<div class="mantra-loading-spinner"></div>`;
}

async function handleIconClick(imgElement, iconElement) {
  showIconLoading(iconElement);

  try {
    const imageBlob = await captureImageAsBlob(imgElement);
    const arrayBuffer = await imageBlob.arrayBuffer();
    const imageData = Array.from(new Uint8Array(arrayBuffer));

    const ocrResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'performOcr',
        imageData,
        mimeType: imageBlob.type
      }, resolve);
    });

    if (!ocrResponse) {
      showToast('No response from background service worker.', 'error');
      return;
    }

    if (!ocrResponse.success) {
      handleOcrError(ocrResponse);
      return;
    }

    const ocrResult = ocrResponse.ocrResult;

    if (!ocrResult || ocrResult.regions.length === 0) {
      showToast('No text detected in image.', 'info');
      return;
    }

    showToast(`Detected ${ocrResult.regions.length} text region(s). Translating...`, 'info');

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
      chrome.runtime.sendMessage({ action: 'openSettings' });
      break;
    case 'AUTH_ERROR':
      showToast('Invalid Google Cloud API key. Check Settings.', 'error');
      break;
    case 'QUOTA_EXCEEDED':
      showToast('Google Cloud quota exceeded. Resets next month.', 'error');
      break;
    case 'SERVER_ERROR':
      showToast('Google Cloud server error. Try again shortly.', 'error');
      break;
    default:
      showToast(`OCR error: ${response.error || 'Unknown error'}`, 'error');
  }
}

function resetFloatingIcon(iconElement) {
  iconElement.innerHTML = `
    <svg width="${FLOATING_ICON_SIZE}" height="${FLOATING_ICON_SIZE}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 8L12 4L18 8V16L12 20L6 16V8Z" fill="#4F63A8"/>
      <path d="M16 12L18 14L16 16L14 14L16 12Z" fill="#4F63A8"/>
    </svg>
  `;
  iconElement.style.opacity = `${ICON_OPACITY_INACTIVE}`;
}

function setupPageObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'IMG') {
            detectImages();
          } else if (node.querySelectorAll) {
            const images = node.querySelectorAll('img:not([data-mantra-icon-injected])');
            if (images.length > 0) detectImages();
          }
        });
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function handleMessage(request, sender, sendResponse) {
  if (request.action === 'toggleExtension') {
    extensionEnabled = request.enabled;
    if (extensionEnabled) {
      detectImages();
    } else {
      document.querySelectorAll('.mantra-floating-icon').forEach(el => el.remove());
      document.querySelectorAll('img').forEach(img => {
        delete img.dataset.mantraIconInjected;
        delete img.dataset.mantraIcon;
      });
    }
    sendResponse({ success: true });
  }
}

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
    fontFamily: 'sans-serif',
    fontSize: '14px',
    zIndex: '10001'
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

init();

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

// Expose helper to global window during tests
if (typeof window !== 'undefined') {
  window.captureImageAsBlob = captureImageAsBlob;
}

window.addEventListener('mantra:ocr-complete', async (event) => {
  const { imgElement, imageBlob, ocrResult } = event.detail;

  // Skip if no text found
  if (!ocrResult || !ocrResult.regions || ocrResult.regions.length === 0) return;

  // Request translation
  const response = await new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'translateRegions',
      regions: ocrResult.regions
    }, resolve);
  });

  if (!response) {
    showToast('No response from background translation worker.', 'error');
    return;
  }

  if (!response.success) {
    handleTranslationError(response);
    return;
  }

  showToast(`Translated ${response.translatedRegions.length} region(s). Rendering...`, 'success');

  // Hand off to canvas rendering (Phase 5)
  window.dispatchEvent(new CustomEvent('mantra:translation-complete', {
    detail: {
      imgElement,
      imageBlob,
      regions: response.translatedRegions
    }
  }));
});

function handleTranslationError(response) {
  switch (response.errorCode) {
    case 'NO_API_KEY':
      showToast('Set translation provider API key in Settings.', 'error');
      break;
    case 'AUTH_ERROR':
      showToast('Invalid API key for translation provider. Check Settings.', 'error');
      break;
    case 'QUOTA_EXCEEDED':
      showToast('Translation quota exceeded. Try a different provider in Settings.', 'error');
      break;
    case 'RATE_LIMITED':
      showToast('Rate limited. Wait a moment and try again.', 'error');
      break;
    case 'PARSE_ERROR':
      showToast('Translation response was malformed. Try again or switch provider.', 'error');
      break;
    default:
      showToast(`Translation failed: ${response.error || 'Unknown error'}`, 'error');
  }
}

