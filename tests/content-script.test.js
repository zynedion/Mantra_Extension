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
});
