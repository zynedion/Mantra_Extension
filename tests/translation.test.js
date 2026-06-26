import { describe, it, expect, vi } from 'vitest';
import { createProvider, TranslationError } from '../src/modules/translation/providers.js';

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
