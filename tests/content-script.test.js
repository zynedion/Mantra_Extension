import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chrome storage and runtime
global.chrome = {
  storage: {
    sync: {
      get: vi.fn((key, cb) => cb({ settings: { enabledOnAllPages: true } }))
    }
  },
  runtime: {
    onMessage: { addListener: vi.fn() }
  }
};

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
});
