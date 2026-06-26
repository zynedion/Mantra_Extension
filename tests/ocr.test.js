import { describe, it, expect, vi } from 'vitest';
import { performOcr, hashImage, OcrError } from '../src/modules/ocr.js';

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

describe('Google Cloud Vision OCR Handler', () => {
  it('hashes image blob into hex format', async () => {
    const mockBlob = new Blob(['hello'], { type: 'text/plain' });
    const hash = await hashImage(mockBlob);
    expect(hash).toHaveLength(64);
  });

  it('performs OCR and parses successful Vision API responses', async () => {
    const mockBlob = new Blob(['image-data'], { type: 'image/jpeg' });
    const mockVisionResponse = {
      responses: [{
        fullTextAnnotation: {
          text: 'こんにちは\n世界',
          pages: [{
            blocks: [{
              paragraphs: [{
                words: [
                  { symbols: [{ text: 'こ' }, { text: 'ん' }, { text: 'に' }, { text: 'ち' }, { text: 'は' }] }
                ],
                boundingBox: { vertices: [{ x: 10, y: 10 }, { x: 100, y: 10 }, { x: 100, y: 50 }, { x: 10, y: 50 }] }
              }],
              boundingBox: { vertices: [{ x: 10, y: 10 }, { x: 100, y: 10 }, { x: 100, y: 50 }, { x: 10, y: 50 }] }
            }]
          }]
        }
      }]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVisionResponse)
    });

    const res = await performOcr(mockBlob, 'mock-api-key');
    expect(res.fullText).toContain('こんにちは');
    expect(res.regions).toHaveLength(1);
    expect(res.regions[0].bounds.width).toBe(90);
  });

  it('throws OcrError for unauthorized HTTP responses', async () => {
    const mockBlob = new Blob(['image-data'], { type: 'image/jpeg' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: { message: 'Invalid API Key' } })
    });

    await expect(performOcr(mockBlob, 'mock-api-key')).rejects.toThrowError(OcrError);
  });
});
