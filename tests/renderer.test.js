import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderTranslatedImage } from '../src/modules/canvas/renderer.js';

describe('Canvas Renderer Module', () => {
  beforeEach(() => {
    global.document.fonts = {
      load: vi.fn().mockResolvedValue([])
    };

    global.createImageBitmap = vi.fn().mockResolvedValue({
      width: 400,
      height: 600,
      close() {}
    });

    global.OffscreenCanvas = class OffscreenCanvas {
      constructor(width, height) {
        this.width = width;
        this.height = height;
        this.ctx = {
          drawImage: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          closePath: vi.fn(),
          fill: vi.fn(),
          quadraticCurveTo: vi.fn(),
          strokeText: vi.fn(),
          fillText: vi.fn(),
          measureText: vi.fn().mockReturnValue({ width: 50 }),
          font: '',
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 0,
          lineJoin: '',
          miterLimit: 0,
          textBaseline: '',
          textAlign: ''
        };
      }
      getContext(type) {
        if (type === '2d') return this.ctx;
        return null;
      }
      async convertToBlob(options) {
        return new Blob(['mock-canvas-blob'], { type: options?.type || 'image/png' });
      }
    };
  });

  it('renders translated regions onto canvas and returns a PNG blob', async () => {
    const originalBlob = new Blob(['original-img'], { type: 'image/jpeg' });
    const regions = [
      {
        id: '1',
        text: 'こんにちは',
        translatedText: 'Halo',
        bounds: { x: 50, y: 50, width: 100, height: 60 },
        vertices: [
          { x: 50, y: 50 },
          { x: 150, y: 50 },
          { x: 150, y: 110 },
          { x: 50, y: 110 }
        ]
      }
    ];
    const settings = {
      fontFamily: 'Bangers',
      fontSize: 16,
      fontColor: '#112233',
      strokeColor: '#ffffff',
      strokeSize: 3,
      textAlignment: 'center',
      lineSpacing: 100,
      letterSpacing: 1,
      borderRadius: 8,
      borderPadding: 4
    };

    const resultBlob = await renderTranslatedImage(originalBlob, regions, settings);

    expect(resultBlob).toBeInstanceOf(Blob);
    expect(resultBlob.type).toBe('image/png');
    expect(global.createImageBitmap).toHaveBeenCalledWith(originalBlob);
  });
});
