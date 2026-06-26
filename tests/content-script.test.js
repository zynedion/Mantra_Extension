import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chrome storage and runtime
global.chrome = {
  storage: {
    sync: {
      get: vi.fn((key, cb) => {
        const res = { settings: { enabledOnAllPages: true } };
        return cb ? cb(res) : Promise.resolve(res);
      })
    },
    local: {
      get: vi.fn((key, cb) => cb ? cb({}) : Promise.resolve({})),
      set: vi.fn((data, cb) => cb ? cb() : Promise.resolve()),
      remove: vi.fn((key, cb) => cb ? cb() : Promise.resolve())
    }
  },
  runtime: {
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn()
  }
};

global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

vi.mock('../src/modules/canvas/renderer.js', () => ({
  renderTranslatedImage: vi.fn().mockResolvedValue(new Blob(['mock-translated'], { type: 'image/png' }))
}));

describe('Content Script Image Detection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetModules();
  });

  it('should detect images and inject floating icon elements', async () => {
    const img = document.createElement('img');
    img.src = 'https://example.com/manga.jpg';
    // Mock bounding box coordinates
    img.getBoundingClientRect = () => ({
      top: 100, left: 100, width: 200, height: 400
    });
    document.body.appendChild(img);

    // Import content-script (starts execution)
    await import('../src/content-script.js');

    // Wait brief tick for storage async load
    await new Promise(r => setTimeout(r, 10));

    const icon = document.querySelector('.mantra-floating-icon');
    expect(icon).not.toBeNull();
    expect(img.dataset.mantraIconInjected).toBe('true');
  });

  it('falls back to background fetch when canvas capture fails', async () => {
    // Mock OffscreenCanvas to throw CORS taint error on drawImage
    global.OffscreenCanvas = class {
      constructor(w, h) {}
      getContext() {
        return {
          drawImage: () => {
            throw new Error('CORS taint');
          }
        };
      }
      convertToBlob() {
        return Promise.resolve(new Blob(['canvas-data'], { type: 'image/jpeg' }));
      }
    };

    // Mock chrome runtime sendMessage
    const mockBlobData = new Uint8Array([1, 2, 3]);
    global.chrome.runtime.sendMessage = vi.fn((msg, cb) => {
      if (msg.action === 'fetchImage') {
        cb({ success: true, data: Array.from(mockBlobData), mimeType: 'image/jpeg' });
      }
    });

    await import('../src/content-script.js');
    await new Promise(r => setTimeout(r, 10));

    const img = document.createElement('img');
    img.src = 'https://cors-blocked.com/manga.jpg';
    // Make img.complete true and naturalWidth non-zero
    Object.defineProperties(img, {
      complete: { value: true },
      naturalWidth: { value: 100 },
      naturalHeight: { value: 100 }
    });

    const blob = await window.captureImageAsBlob(img);
    expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'fetchImage', url: 'https://cors-blocked.com/manga.jpg' }),
      expect.any(Function)
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBe(3);
  });

  it('handles mantra:ocr-complete event and triggers translateRegions message', async () => {
    // Mock chrome runtime sendMessage
    global.chrome.runtime.sendMessage = vi.fn((msg, cb) => {
      if (msg.action === 'translateRegions') {
        cb({
          success: true,
          translatedRegions: [{ id: '1', originalText: 'こんにちは', translatedText: 'Halo' }]
        });
      }
    });

    const mockOcrResult = {
      regions: [{ id: '1', text: 'こんにちは', bounds: { x: 0, y: 0, width: 10, height: 10 } }]
    };

    // Watch CustomEvent dispatch
    const completeSpy = vi.fn();
    window.addEventListener('mantra:translation-complete', completeSpy);

    await import('../src/content-script.js');

    // Trigger the event
    window.dispatchEvent(new CustomEvent('mantra:ocr-complete', {
      detail: {
        imgElement: document.createElement('img'),
        imageBlob: new Blob(['data'], { type: 'image/jpeg' }),
        ocrResult: mockOcrResult
      }
    }));

    await new Promise(r => setTimeout(r, 20));

    expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'translateRegions', regions: mockOcrResult.regions }),
      expect.any(Function)
    );
    expect(completeSpy).toHaveBeenCalled();
    const eventDetail = completeSpy.mock.calls[0][0].detail;
    expect(eventDetail.regions[0].translatedText).toBe('Halo');
  });

  it('handles mantra:translation-complete event, renders overlay, and handles dismiss/download clicks', async () => {
    await import('../src/content-script.js');

    const img = document.createElement('img');
    img.dataset.mantraIcon = 'test-icon';
    img.getBoundingClientRect = () => ({
      top: 100, left: 100, width: 200, height: 400
    });
    document.body.appendChild(img);

    const imageBlob = new Blob(['data'], { type: 'image/jpeg' });
    const regions = [{ id: '1', translatedText: 'Halo', bounds: { x: 0, y: 0, width: 10, height: 10 } }];

    window.dispatchEvent(new CustomEvent('mantra:translation-complete', {
      detail: {
        imgElement: img,
        imageBlob,
        regions
      }
    }));

    // Wait brief tick for async rendering and overlay injection
    await new Promise(r => setTimeout(r, 20));

    const overlay = document.querySelector('.mantra-overlay-image');
    expect(overlay).not.toBeNull();
    expect(overlay.src).toBe('blob:mock-url');

    // Test click to dismiss
    const removeSpy = vi.spyOn(overlay, 'remove');
    overlay.dispatchEvent(new CustomEvent('click'));
    expect(removeSpy).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    // Clean up
    img.remove();
  });

  it('maps OCR/translation errors through getErrorDisplay and renders toast with action button', async () => {
    await import('../src/content-script.js');

    // Trigger mantra:ocr-complete with an error response
    global.chrome.runtime.sendMessage = vi.fn((msg, cb) => {
      if (msg.action === 'translateRegions') {
        cb({
          success: false,
          errorCode: 'NO_API_KEY',
          error: 'API key is missing'
        });
      }
    });

    const mockOcrResult = {
      regions: [{ id: '1', text: 'こんにちは', bounds: { x: 0, y: 0, width: 10, height: 10 } }]
    };

    window.dispatchEvent(new CustomEvent('mantra:ocr-complete', {
      detail: {
        imgElement: document.createElement('img'),
        imageBlob: new Blob(['data'], { type: 'image/jpeg' }),
        ocrResult: mockOcrResult
      }
    }));

    await new Promise(r => setTimeout(r, 20));

    const toast = document.querySelector('.mantra-toast-error');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain('API key is missing');

    const actionBtn = toast.querySelector('.mantra-toast-action');
    expect(actionBtn).not.toBeNull();
    expect(actionBtn.textContent).toBe('Open Settings');

    // Click action button and verify local storage set and message send
    actionBtn.click();
    expect(global.chrome.storage.local.set).toHaveBeenCalledWith(
      { openSettingsTab: 'api' },
      expect.any(Function)
    );
    // Trigger callback
    const setCallback = global.chrome.storage.local.set.mock.calls[0][1];
    setCallback();
    expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'openSettings' });

    toast.remove();
  });
});
