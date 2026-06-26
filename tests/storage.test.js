import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { HistoryStore } from '../src/modules/storage.js';

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
