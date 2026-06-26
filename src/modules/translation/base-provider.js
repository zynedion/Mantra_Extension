export class TranslationProvider {
  constructor(apiKey) {
    if (!apiKey) throw new TranslationError('NO_API_KEY', `${this.constructor.name}: no API key`);
    this.apiKey = apiKey;
  }

  async translate(regions, sourceLang, targetLang) {
    throw new Error('translate() not implemented');
  }

  buildPrompt(regions, sourceLang, targetLang) {
    const langMap = {
      ja: 'Japanese', zh: 'Chinese', ko: 'Korean', en: 'English',
      id: 'Indonesian', es: 'Spanish', fr: 'French', de: 'German'
    };
    const sourceLabel = langMap[sourceLang] || sourceLang;
    const targetLabel = langMap[targetLang] || targetLang;

    const numbered = regions
      .map((r, i) => `${i + 1}. ${r.text.replace(/\n/g, ' / ')}`)
      .join('\n');

    return `You are translating manga dialogue from ${sourceLabel} to ${targetLabel}. Keep the tone natural and conversational, preserving character emotion. Honor onomatopoeia and shouts (e.g. キャー → AAH!). Do NOT add extra explanation.

Translate each numbered line. Return ONLY a JSON array of strings in the same order, no markdown, no commentary.

Lines to translate:
${numbered}

Example output format (return ONLY this, nothing else):
["translation 1", "translation 2", "translation 3"]`;
  }

  parseJsonResponse(text, expectedLength) {
    let cleaned = text.trim();

    // Strip markdown code fences
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

    // Try to find JSON array in the text
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) cleaned = arrayMatch[0];

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      throw new TranslationError('PARSE_ERROR', `Failed to parse translation response: ${err.message}`);
    }

    if (!Array.isArray(parsed)) {
      throw new TranslationError('PARSE_ERROR', 'Expected JSON array');
    }

    // Pad/truncate to match expected length
    if (parsed.length < expectedLength) {
      while (parsed.length < expectedLength) parsed.push('');
    } else if (parsed.length > expectedLength) {
      parsed.length = expectedLength;
    }

    return parsed.map(t => String(t || ''));
  }

  mapResults(regions, translations) {
    return regions.map((r, i) => ({
      id: r.id,
      originalText: r.text,
      translatedText: translations[i] || ''
    }));
  }
}

export class TranslationError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'TranslationError';
    this.code = code;
    this.details = details;
  }
}
