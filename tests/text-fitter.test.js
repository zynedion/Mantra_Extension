import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fitTextInBounds } from '../src/modules/canvas/text-fitter.js';

describe('Text Fitter Module', () => {
  beforeEach(() => {
    // Mock measureText behavior in JSDOM: width = charCount * fontSize * 0.6
    const mockMeasure = function(text) {
      const match = this.font.match(/(\d+)px/);
      const fontSize = match ? parseInt(match[1], 10) : 10;
      return { width: text.length * fontSize * 0.6 };
    };

    if (typeof OffscreenCanvas === 'undefined') {
      global.OffscreenCanvas = class OffscreenCanvas {
        constructor() {
          this.canvas = document.createElement('canvas');
        }
        getContext(type) {
          const ctx = this.canvas.getContext(type);
          if (ctx) {
            ctx.measureText = mockMeasure.bind(ctx);
          }
          return ctx;
        }
      };
    } else {
      const origOffscreenGetContext = OffscreenCanvas.prototype.getContext;
      OffscreenCanvas.prototype.getContext = function(type) {
        const ctx = origOffscreenGetContext.call(this, type);
        if (ctx) {
          ctx.measureText = mockMeasure.bind(ctx);
        }
        return ctx;
      };
    }

    const origHTMLGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type) {
      const ctx = origHTMLGetContext.call(this, type);
      if (ctx && type === '2d') {
        ctx.measureText = mockMeasure.bind(ctx);
      }
      return ctx;
    };
  });

  it('wraps space-separated English text word-by-word', () => {
    const text = 'Hello world this is a test';
    // bounds width = 60. at 10px font, each char is 6px.
    // 'Hello world' is 11 chars * 6px = 66px (doesn't fit 60-8=52px inner width).
    // Word wrapping should break it nicely.
    const bounds = { x: 0, y: 0, width: 80, height: 100 };
    const result = fitTextInBounds(text, bounds, 'sans-serif', {
      minFontSize: 12,
      maxFontSize: 12,
      padding: 4
    });

    expect(result.lines.length).toBeGreaterThan(1);
    expect(result.lines[0]).toBe('Hello');
  });

  it('wraps CJK characters character-by-character when no spaces exist', () => {
    const text = '日本語のテキストです';
    const bounds = { x: 0, y: 0, width: 40, height: 100 }; // very narrow
    const result = fitTextInBounds(text, bounds, 'sans-serif', {
      minFontSize: 12,
      maxFontSize: 12,
      padding: 4
    });

    expect(result.lines.length).toBeGreaterThan(2);
    // Each line should contain a sequence of Japanese characters
    expect(result.lines[0].length).toBeLessThan(text.length);
  });

  it('performs binary search to find the optimal font size fitting constraints', () => {
    const text = 'Manga Translator';
    const bounds = { x: 0, y: 0, width: 100, height: 50 };
    const result = fitTextInBounds(text, bounds, 'sans-serif', {
      minFontSize: 6,
      maxFontSize: 24,
      padding: 4
    });

    expect(result.fontSize).toBeLessThanOrEqual(24);
    expect(result.fontSize).toBeGreaterThanOrEqual(6);
    expect(result.fits).toBe(true);
  });

  it('falls back to minimum font size and allows overflow if text is too large', () => {
    const text = 'Extremely long sentence that cannot fit inside this tiny bubble even at minimum font size';
    const bounds = { x: 0, y: 0, width: 20, height: 10 };
    const result = fitTextInBounds(text, bounds, 'sans-serif', {
      minFontSize: 6,
      maxFontSize: 12,
      padding: 2
    });

    expect(result.fontSize).toBe(6);
    expect(result.fits).toBe(false);
  });

  it('handles custom line spacing options correctly', () => {
    const text = 'Line 1\nLine 2';
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    const result = fitTextInBounds(text, bounds, 'sans-serif', {
      minFontSize: 10,
      maxFontSize: 10,
      lineSpacingPercent: 150,
      padding: 4
    });

    expect(result.lineHeight).toBe(15); // 10 * 1.5
  });
});
