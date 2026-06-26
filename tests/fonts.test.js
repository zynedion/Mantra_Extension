import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadFont, FONTS, _resetLoadedFonts } from '../src/modules/fonts.js';

describe('Font Loading Module', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    if (typeof _resetLoadedFonts === 'function') {
      _resetLoadedFonts();
    }
  });

  it('injects Google Font stylesheet link if not already present', async () => {
    const mockLoad = vi.fn().mockResolvedValue([]);
    global.document.fonts = { load: mockLoad };

    await loadFont('Bangers');

    const link = document.querySelector('link[data-mantra-font="Bangers"]');
    expect(link).not.toBeNull();
    expect(link.rel).toBe('stylesheet');
    expect(link.href).toBe(FONTS.Bangers.googleUrl);
    expect(mockLoad).toHaveBeenCalledWith('16px "Bangers"');
  });

  it('does not duplicate link element on subsequent calls', async () => {
    const mockLoad = vi.fn().mockResolvedValue([]);
    global.document.fonts = { load: mockLoad };

    await loadFont('Bangers');
    await loadFont('Bangers');

    const links = document.querySelectorAll('link[data-mantra-font="Bangers"]');
    expect(links.length).toBe(1);
  });

  it('falls back gracefully and does not throw when document.fonts is missing', async () => {
    const originalFonts = global.document.fonts;
    // Temporarily delete fonts
    Object.defineProperty(global.document, 'fonts', {
      value: undefined,
      configurable: true,
      writable: true
    });

    await expect(loadFont('KomikaJam')).resolves.not.toThrow();

    // Restore
    if (originalFonts) {
      Object.defineProperty(global.document, 'fonts', {
        value: originalFonts,
        configurable: true,
        writable: true
      });
    }
  });
});
