import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';

// Polyfill Blob.prototype.arrayBuffer for jsdom/node test environment if missing
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function() {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(this);
    });
  };
}

// Mock chrome API
const mockStorage = {};
global.chrome = {
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() }
  },
  storage: {
    sync: {
      get: vi.fn((key, cb) => cb ? cb(mockStorage) : Promise.resolve(mockStorage)),
      set: vi.fn((data, cb) => {
        Object.assign(mockStorage, data);
        return cb ? cb() : Promise.resolve();
      })
    }
  },
  alarms: {
    create: vi.fn(),
    onAlarm: { addListener: vi.fn() }
  }
};

describe('Background Service Worker', () => {
  beforeEach(() => {
    vi.resetModules();
    mockStorage.settings = undefined;
  });

  it('should initialize default settings', async () => {
    await import('../src/background.js');
    
    // Trigger the mocked onInstalled handler if it was bound
    const installHandler = global.chrome.runtime.onInstalled.addListener.mock.calls[0][0];
    installHandler();

    expect(mockStorage.settings).toBeDefined();
    expect(mockStorage.settings.enabledOnAllPages).toBe(true);
    expect(mockStorage.settings.targetLanguage).toBe('id');
  });

  it('handles testApiKey action by calling test handlers', async () => {
    mockStorage.apiKeys = {
      googleCloud: { key: 'mock-google-key' }
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    await import('../src/background.js');

    const messageHandler = global.chrome.runtime.onMessage.addListener.mock.calls[0][0];
    const sendResponse = vi.fn();
    messageHandler({ action: 'testApiKey', provider: 'googleCloud' }, {}, sendResponse);

    await new Promise(r => setTimeout(r, 10));
    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('handles performOcr request actions', async () => {
    mockStorage.apiKeys = { googleCloud: { key: 'mock-google-key' } };
    const mockImageBytes = Array.from(new Uint8Array([1, 2, 3]));
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        responses: [{ fullTextAnnotation: { text: 'Detected' } }]
      })
    });

    await import('../src/background.js');

    const messageHandler = global.chrome.runtime.onMessage.addListener.mock.calls[0][0];
    const sendResponse = vi.fn();
    messageHandler({ action: 'performOcr', imageData: mockImageBytes, mimeType: 'image/jpeg' }, {}, sendResponse);

    for (let i = 0; i < 20; i++) {
      if (sendResponse.mock.calls.length > 0) break;
      await new Promise(r => setTimeout(r, 50));
    }
    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
