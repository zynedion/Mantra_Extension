import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { HistoryStore, OcrCacheStore, TranslationCacheStore } from '../src/modules/storage.js';

global.chrome = {
  storage: {
    sync: {
      get: vi.fn((key, cb) => cb({ settings: {} })),
      set: vi.fn((val, cb) => cb && cb())
    }
  }
};

describe('HistoryStore Operations', () => {
  beforeEach(async () => {
    await HistoryStore.clear();
  });

  it('saves a record and retrieves it by id', async () => {
    const mockRecord = {
      id: 'test-uuid-1',
      originalText: 'こんにちは',
      translatedText: 'Hello',
      siteUrl: 'https://example.com'
    };

    const id = await HistoryStore.save(mockRecord);
    expect(id).toBe('test-uuid-1');

    const retrieved = await HistoryStore.getById(id);
    expect(retrieved.translatedText).toBe('Hello');
  });
});

describe('OcrCacheStore Operations', () => {
  beforeEach(async () => {
    try {
      await OcrCacheStore.clear();
    } catch (e) {
      // In case DB doesn't exist/upgrade yet
    }
  });

  it('saves OCR result and retrieves it, enforcing 7-day expiration', async () => {
    const hash = 'mock-sha256-hash-val';
    const ocrResult = { fullText: 'テスト', regions: [{ id: '1', text: 'テスト', bounds: { x: 0, y: 0, width: 50, height: 20 } }] };

    await OcrCacheStore.set(hash, ocrResult);
    const retrieved = await OcrCacheStore.get(hash);
    expect(retrieved).not.toBeNull();
    expect(retrieved.fullText).toBe('テスト');

    // Test expiration
    const db = await OcrCacheStore.getDBInstance();
    const expiredDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    await db.put('ocrCache', { hash, ocrResult, cachedAt: expiredDate });

    const expiredRetrieved = await OcrCacheStore.get(hash);
    expect(expiredRetrieved).toBeNull();
  });
});

describe('TranslationCacheStore Operations', () => {
  beforeEach(async () => {
    try {
      await TranslationCacheStore.clear();
    } catch (e) {
      // In case DB doesn't exist/upgrade yet
    }
  });

  it('caches translation and retrieves it, enforcing 30-day expiration', async () => {
    const text = 'こんにちは';
    const sourceLang = 'ja';
    const targetLang = 'id';
    const translatedText = 'Halo';

    await TranslationCacheStore.set(text, sourceLang, targetLang, translatedText);
    const retrieved = await TranslationCacheStore.get(text, sourceLang, targetLang);
    expect(retrieved).toBe(translatedText);

    // Verify expiration
    const db = await TranslationCacheStore.getDBInstance();
    const key = await TranslationCacheStore.hashKey(text, sourceLang, targetLang);
    const expiredDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    await db.put('translationCache', { key, translatedText, cachedAt: expiredDate });

    const expiredRetrieved = await TranslationCacheStore.get(text, sourceLang, targetLang);
    expect(expiredRetrieved).toBeNull();
  });
});
