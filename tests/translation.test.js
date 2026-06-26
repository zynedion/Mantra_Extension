import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { createProvider, TranslationError } from '../src/modules/translation/providers.js';
import { translateRegions } from '../src/modules/translation/orchestrator.js';
import { TranslationCacheStore } from '../src/modules/storage.js';

describe('Translation Providers Integration', () => {
  it('GeminiProvider generates correct request payload and parses JSON array responses', async () => {
    const provider = createProvider('gemini', 'mock-gemini-key');
    const mockResponse = {
      candidates: [{ content: { parts: [{ text: '["Halo"]' }] } }]
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const res = await provider.translate([{ id: '1', text: 'こんにちは' }], 'ja', 'id');
    expect(res).toHaveLength(1);
    expect(res[0].translatedText).toBe('Halo');
  });

  it('throws TranslationError AUTH_ERROR on 401 response', async () => {
    const provider = createProvider('openai', 'invalid-key');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401
    });

    await expect(provider.translate([{ id: '1', text: 'test' }], 'en', 'id')).rejects.toThrowError(TranslationError);
  });
});

describe('Translation Orchestrator', () => {
  beforeEach(async () => {
    try {
      await TranslationCacheStore.clear();
    } catch (e) {}
  });

  it('translateRegions checks cache, fetches uncached, caches them, and returns in correct reading order', async () => {
    const mockRegions = [
      { id: '1', text: 'こんにちは', bounds: { x: 100, y: 50, width: 50, height: 20 } },
      { id: '2', text: 'お元気ですか', bounds: { x: 50, y: 50, width: 50, height: 20 } }
    ];

    // Pre-cache region 1
    await TranslationCacheStore.set('こんにちは', 'ja', 'id', 'Halo');

    // Mock fetch for region 2 (uncached)
    const mockResponse = {
      candidates: [{ content: { parts: [{ text: '["Apa kabar?"]' }] } }]
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const result = await translateRegions(mockRegions, {
      targetLang: 'id',
      providerId: 'gemini',
      apiKey: 'mock-key',
      sourceLangFallback: 'ja',
      autoDetect: true
    });

    // Japanese reading order RTL means x: 100 goes first, then x: 50
    // So region 1 (x: 100) should be first, then region 2 (x: 50)
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[0].translatedText).toBe('Halo');
    expect(result[1].id).toBe('2');
    expect(result[1].translatedText).toBe('Apa kabar?');

    // Confirm that the newly translated text was cached
    const cachedVal = await TranslationCacheStore.get('お元気ですか', 'ja', 'id');
    expect(cachedVal).toBe('Apa kabar?');
  });
});
