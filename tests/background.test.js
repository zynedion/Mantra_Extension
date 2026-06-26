import { describe, it, expect, vi, beforeEach } from 'vitest';

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
});
