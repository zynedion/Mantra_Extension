import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import HistoryGallery from '../src/components/settings/HistoryGallery.jsx';
import { HistoryStore } from '../src/modules/storage.js';

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

global.chrome = {
  downloads: {
    download: vi.fn()
  }
};

global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

vi.mock('../src/modules/storage.js', () => ({
  HistoryStore: {
    getRecent: vi.fn(),
    count: vi.fn(),
    delete: vi.fn()
  }
}));

describe('HistoryGallery Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state if no history records exist', async () => {
    HistoryStore.getRecent.mockResolvedValue([]);
    HistoryStore.count.mockResolvedValue(0);

    await act(async () => {
      render(<HistoryGallery />);
    });

    expect(screen.getByText('No translations yet.')).toBeDefined();
  });

  it('renders thumbnail list when translations exist', async () => {
    const mockOriginalBlob = new Blob(['orig'], { type: 'image/jpeg' });
    const mockTranslatedBlob = new Blob(['trans'], { type: 'image/png' });
    const mockEntries = [
      {
        id: '1',
        createdAt: '2026-06-26T10:30:15.000Z',
        originalImageBlob: mockOriginalBlob,
        translatedImageBlob: mockTranslatedBlob,
        originalText: 'こんにちは',
        translatedText: 'Halo',
        siteUrl: 'https://mangadex.org',
        sourceLang: 'ja',
        targetLang: 'id',
        translationModel: 'langbly',
        regions: []
      }
    ];

    HistoryStore.getRecent.mockResolvedValue(mockEntries);
    HistoryStore.count.mockResolvedValue(1);

    await act(async () => {
      render(<HistoryGallery />);
    });

    expect(screen.getByText('1 translation total')).toBeDefined();
    const img = screen.getByRole('img');
    expect(img.src).toContain('blob:mock-url');
  });
});
