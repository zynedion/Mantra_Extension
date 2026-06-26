import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildHistoryZip } from '../src/modules/zip-export.js';
import { HistoryStore } from '../src/modules/storage.js';
import { unzipSync } from 'fflate';

vi.mock('../src/modules/storage.js', () => ({
  HistoryStore: {
    getAll: vi.fn()
  }
}));

describe('ZIP Export Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    if (!Blob.prototype.arrayBuffer) {
      Blob.prototype.arrayBuffer = function() {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsArrayBuffer(this);
        });
      };
    }
  });

  it('throws an error if there are no history entries to export', async () => {
    HistoryStore.getAll.mockResolvedValue([]);
    await expect(buildHistoryZip()).rejects.toThrow('No history to export');
  });

  it('compiles a structured ZIP archive from history records', async () => {
    const mockOriginalBlob = new Blob(['mock-original-jpg-bytes'], { type: 'image/jpeg' });
    const mockTranslatedBlob = new Blob(['mock-translated-png-bytes'], { type: 'image/png' });

    const mockEntries = [
      {
        id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        createdAt: '2026-06-26T10:30:15.000Z',
        originalImageBlob: mockOriginalBlob,
        translatedImageBlob: mockTranslatedBlob,
        originalText: 'こんにちは',
        translatedText: 'Halo',
        siteUrl: 'https://mangadex.org/chapter/12345',
        sourceLang: 'ja',
        targetLang: 'id',
        translationModel: 'langbly',
        canvasSettings: { fontSize: 16 },
        regions: [{ id: '1', text: 'こんにちは', translatedText: 'Halo', bounds: { x: 10, y: 10, width: 50, height: 20 }, sourceLang: 'ja' }]
      }
    ];

    HistoryStore.getAll.mockResolvedValue(mockEntries);

    const zipBlob = await buildHistoryZip();
    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.type).toBe('application/zip');

    const arrayBuffer = await zipBlob.arrayBuffer();
    const decompressed = unzipSync(new Uint8Array(arrayBuffer));

    expect(decompressed['README.md']).toBeDefined();
    expect(decompressed['manifest.json']).toBeDefined();

    const keys = Object.keys(decompressed);

    const manifestText = new TextDecoder().decode(decompressed['manifest.json']);
    const manifest = JSON.parse(manifestText);
    expect(manifest.totalEntries).toBe(1);
    expect(manifest.entries[0].id).toBe(mockEntries[0].id);

    const originalPath = keys.find(k => k.endsWith('original.jpg'));
    const translatedPath = keys.find(k => k.endsWith('translated.png'));
    const metadataPath = keys.find(k => k.endsWith('metadata.json'));

    expect(originalPath).toBeDefined();
    expect(translatedPath).toBeDefined();
    expect(metadataPath).toBeDefined();

    const originalTextData = new TextDecoder().decode(decompressed[originalPath]);
    expect(originalTextData).toBe('mock-original-jpg-bytes');

    const metadataText = new TextDecoder().decode(decompressed[metadataPath]);
    const metadata = JSON.parse(metadataText);
    expect(metadata.id).toBe(mockEntries[0].id);
    expect(metadata.regions[0].translatedText).toBe('Halo');
  });
});
