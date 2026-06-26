console.log('[Mantra] Background service worker initialized');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Mantra] Extension installed');
  chrome.storage.sync.get('settings', (result) => {
    if (!result || !result.settings) {
      initializeDefaultSettings();
    }
  });
});

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
  
  chrome.storage.sync.set({ settings: defaultSettings }, () => {
    console.log('[Mantra] Default settings initialized');
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Mantra] Background received:', request.action);
  if (request.action === 'performOcr') {
    sendResponse({ success: false, error: 'OCR implementation in Phase 3' });
  } else if (request.action === 'translateText') {
    sendResponse({ success: false, error: 'Translation implementation in Phase 4' });
  } else if (request.action === 'getSetting') {
    const { key } = request;
    chrome.storage.sync.get('settings', (result) => {
      if (result.settings && result.settings[key] !== undefined) {
        sendResponse({ success: true, value: result.settings[key] });
      } else {
        sendResponse({ success: false, error: `Setting not found: ${key}` });
      }
    });
  }
  return true;
});
