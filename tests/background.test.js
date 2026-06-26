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
      get: vi.fn((key, cb) => cb(mockStorage)),
      set: vi.fn((data, cb) => {
        Object.assign(mockStorage, data);
        if (cb) cb();
      })
    }
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
});
