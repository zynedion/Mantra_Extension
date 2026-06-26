import { HistoryStore, ApiKeyStore, OcrCacheStore, SettingsStore } from './modules/storage.js';
import { performOcr, hashImage, OcrError } from './modules/ocr.js';
import { refineRegions, sortReadingOrder } from './modules/bubble-grouping.js';
import { translateRegions } from './modules/translation/orchestrator.js';
import { TranslationError } from './modules/translation/base-provider.js';

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
    handleOcrRequest(request).then(sendResponse);
    return true;
  } else if (request.action === 'translateRegions') {
    handleTranslationRequest(request).then(sendResponse);
    return true;
  } else if (request.action === 'saveToHistory') {
    handleHistorySave(request).then(sendResponse);
    return true;
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
  } else if (request.action === 'fetchImage') {
    fetchImageAsBuffer(request.url).then(sendResponse);
    return true;
  } else if (request.action === 'openSettings') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
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

async function fetchImageAsBuffer(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    const buffer = await response.arrayBuffer();
    return {
      success: true,
      data: Array.from(new Uint8Array(buffer)),
      mimeType: response.headers.get('Content-Type') || 'image/jpeg'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleOcrRequest(request) {
  try {
    const apiKey = await ApiKeyStore.get('googleCloud');
    if (!apiKey) {
      return {
        success: false,
        errorCode: 'NO_API_KEY',
        error: 'Google Cloud Vision API key not configured. Add it in Settings → API Keys.'
      };
    }

    if (!request.imageData) {
      return {
        success: false,
        errorCode: 'INVALID_REQUEST',
        error: 'No image data provided.'
      };
    }

    // Reconstruct blob from transferred data
    const imageBlob = new Blob(
      [new Uint8Array(request.imageData)],
      { type: request.mimeType || 'image/jpeg' }
    );

    // Check cache
    const hash = await hashImage(imageBlob);
    let cached = await OcrCacheStore.get(hash);
    
    let ocrResult;
    let cachedHit = false;
    
    if (cached) {
      console.log('[Mantra] OCR cache hit:', hash.substring(0, 8));
      ocrResult = cached;
      cachedHit = true;
    } else {
      // Call API
      console.log('[Mantra] OCR cache miss, calling Google Cloud Vision');
      ocrResult = await performOcr(imageBlob, apiKey);
      
      // Cache result
      await OcrCacheStore.set(hash, ocrResult);
    }

    // Post-process regions: refine & sort
    if (ocrResult && ocrResult.regions) {
      ocrResult.regions = refineRegions(ocrResult.regions);
      
      // Determine source language for reading order sort.
      // Get settings to check if autoDetectLanguage is enabled.
      const settingsResult = await new Promise((resolve) => {
        chrome.storage.sync.get('settings', resolve);
      });
      const settings = settingsResult?.settings || {};
      const autoDetect = settings.autoDetectLanguage !== false;
      const fallback = settings.sourceLanguageFallback || 'ja';
      
      let sourceLang = fallback;
      if (autoDetect && ocrResult.detectedLanguages && ocrResult.detectedLanguages.length > 0) {
        sourceLang = ocrResult.detectedLanguages.includes('ja') ? 'ja' : ocrResult.detectedLanguages[0];
      }
      
      ocrResult.regions = sortReadingOrder(ocrResult.regions, sourceLang);
    }

    return { success: true, ocrResult, cached: cachedHit };
  } catch (error) {
    console.error('[Mantra] handleOcrRequest error:', error);
    if (error instanceof OcrError) {
      return { success: false, errorCode: error.code, error: error.message, details: error.details };
    }
    return { success: false, errorCode: 'UNKNOWN', error: error.message };
  }
}

async function handleTranslationRequest(request) {
  try {
    const settings = await SettingsStore.getAll();
    const providerId = settings.translationProvider || 'langbly';
    const apiKey = await ApiKeyStore.get(providerId);

    if (!apiKey) {
      return {
        success: false,
        errorCode: 'NO_API_KEY',
        error: `${providerId} API key not configured. Set it in Settings → API Keys.`
      };
    }

    const translated = await translateRegions(request.regions, {
      targetLang: settings.targetLanguage,
      providerId,
      apiKey,
      sourceLangFallback: settings.sourceLanguageFallback,
      autoDetect: settings.autoDetectLanguage
    });

    return { success: true, translatedRegions: translated };
  } catch (error) {
    console.error('[Mantra] handleTranslationRequest error:', error);
    if (error instanceof TranslationError) {
      return { success: false, errorCode: error.code, error: error.message };
    }
    return { success: false, errorCode: 'UNKNOWN', error: error.message };
  }
}

async function handleHistorySave(request) {
  try {
    const settings = await SettingsStore.getAll();
    if (!settings.autoSave) {
      return { success: false, skipped: true, reason: 'Auto-save disabled' };
    }

    const entry = request.entry;
    const originalBlob = new Blob(
      [new Uint8Array(entry.originalImageData || [])],
      { type: 'image/jpeg' }
    );
    const translatedBlob = new Blob(
      [new Uint8Array(entry.translatedImageData || [])],
      { type: 'image/png' }
    );

    const id = await HistoryStore.save({
      originalImageBlob: originalBlob,
      translatedImageBlob: translatedBlob,
      originalText: entry.originalText || '',
      translatedText: entry.translatedText || '',
      siteUrl: entry.siteUrl,
      sourceLang: entry.sourceLang,
      targetLang: entry.targetLang,
      translationModel: entry.translationModel,
      canvasSettings: entry.canvasSettings,
      regions: entry.regions
    });

    return { success: true, id };
  } catch (error) {
    console.error('[Mantra] Save to history failed:', error);
    return { success: false, error: error.message };
  }
}

