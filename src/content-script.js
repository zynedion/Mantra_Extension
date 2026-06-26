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

function handleIconClick(imgElement, iconElement) {
  iconElement.style.opacity = '1';
  iconElement.innerHTML = `<div class="mantra-loading-spinner"></div>`;

  setTimeout(() => {
    resetFloatingIcon(iconElement);
    showToast('OCR triggered! (Phase 3 integration)', 'info');
  }, 1500);
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
