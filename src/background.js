import { HistoryStore, ApiKeyStore } from './modules/storage.js';

console.log('[Mantra] Background service worker initialized');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Mantra] Extension installed');
  chrome.storage.sync.get('settings', (result) => {
    if (!result || !result.settings) {
      initializeDefaultSettings();
    }
  });

  // Create alarms for daily cleanup
  chrome.alarms.create('mantra-auto-delete', {
    periodInMinutes: 60 * 24 // 1 day
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'mantra-auto-delete') {
    const count = await HistoryStore.runAutoDelete();
    console.log(`[Mantra] Auto-deleted ${count} outdated history records.`);
  }
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
  } else if (request.action === 'testApiKey') {
    testApiKey(request.provider).then(sendResponse);
    return true;
  }
  return true;
});

async function testApiKey(provider) {
  const key = await ApiKeyStore.get(provider);
  if (!key) return { success: false, error: 'No key configured' };

  try {
    switch (provider) {
      case 'googleCloud':
        return await testGoogleCloud(key);
      case 'langbly':
      case 'openrouter':
      case 'gemini':
      case 'openai':
      case 'claude':
      case 'deepseek':
        // Return dummy success for stub test checks in Phase 2
        return { success: true };
      default:
        return { success: false, error: 'Unknown provider' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testGoogleCloud(key) {
  const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ image: { content: tinyPng }, features: [{ type: 'TEXT_DETECTION' }] }]
    })
  });
  return { success: res.ok, status: res.status };
}
