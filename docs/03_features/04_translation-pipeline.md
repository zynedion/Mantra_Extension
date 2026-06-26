# Feature 04: Translation Pipeline (Multi-LLM)
## Phase 4 — AI Translation Layer

**Objective:** Translate OCR-extracted text using user-selected LLM provider, with language detection, prompt optimization for manga, and graceful provider switching.

**Timeline:** 3-4 days
**Dependencies:** Phase 3 complete (OCR returns structured regions)

**Acceptance Criteria:**
- ✅ All 6 LLM providers (Langbly, OpenRouter, Gemini, OpenAI, Claude, DeepSeek) functional
- ✅ Language auto-detection works (francjs fallback to user setting)
- ✅ Translation preserves manga tone (natural, conversational)
- ✅ Batch multiple regions in single API call (efficiency)
- ✅ Translation results cached per (text + targetLang) pair
- ✅ Error handling per provider with helpful messages

---

## 1. ARCHITECTURE FLOW

```
mantra:ocr-complete event received (Phase 3 output)
  ↓
For each region: detect source language (francjs)
  ↓
Group regions by detected language
  ↓
Check translation cache (text + targetLang hash)
  ↓
  [Cache HIT for all] → use cached
  [Cache MISS] → continue
  ↓
Build batched translation request (manga-aware prompt)
  ↓
Send to active LLM provider
  ↓
Parse response → map back to region IDs
  ↓
Cache translations
  ↓
Emit "mantra:translation-complete" event with translated regions
```

---

## 2. LANGUAGE DETECTION

### **File: `src/modules/lang-detect.js`**

```javascript
import { franc } from 'franc';

const FRANC_TO_ISO = {
  jpn: 'ja',
  cmn: 'zh', // Mandarin
  yue: 'zh', // Cantonese
  zho: 'zh',
  kor: 'ko',
  eng: 'en',
  ind: 'id',
  spa: 'es',
  fra: 'fr',
  deu: 'de'
};

/**
 * Detect language of text. Falls back to `fallbackLang` if too short or undetected.
 * @param {string} text
 * @param {string} fallbackLang - ISO 639-1 (e.g. 'ja')
 * @returns {string} ISO 639-1 code
 */
export function detectLanguage(text, fallbackLang = 'ja') {
  const cleaned = text.trim();

  // Too short for franc — use fallback
  if (cleaned.length < 5) {
    return fallbackLang;
  }

  // CJK character heuristic (franc unreliable for short CJK)
  if (containsJapaneseKana(cleaned)) return 'ja';
  if (containsHangul(cleaned)) return 'ko';

  const code = franc(cleaned, { minLength: 5 });
  const iso = FRANC_TO_ISO[code];

  if (!iso || code === 'und') {
    // Heuristic: if Chinese characters present, likely zh
    if (containsCJK(cleaned)) return 'zh';
    return fallbackLang;
  }

  return iso;
}

function containsJapaneseKana(text) {
  // Hiragana (U+3040-U+309F) or Katakana (U+30A0-U+30FF)
  return /[\u3040-\u30FF]/.test(text);
}

function containsHangul(text) {
  return /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text);
}

function containsCJK(text) {
  return /[\u4E00-\u9FFF]/.test(text);
}
```

---

## 3. PROVIDER ABSTRACTION

### **File: `src/modules/translation/base-provider.js`**

```javascript
/**
 * Base class for all translation providers.
 * Each provider implements `translate(regions, sourceLang, targetLang)`
 * and returns an array of { id, translatedText }.
 */

export class TranslationProvider {
  constructor(apiKey) {
    if (!apiKey) throw new TranslationError('NO_API_KEY', `${this.constructor.name}: no API key`);
    this.apiKey = apiKey;
  }

  async translate(regions, sourceLang, targetLang) {
    throw new Error('translate() not implemented');
  }

  /**
   * Build the manga-aware translation prompt.
   * Returns a structured prompt that asks for JSON-formatted output.
   */
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

  /**
   * Parse JSON response, robust against markdown fences and extra text.
   */
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
```

---

## 4. PROVIDER IMPLEMENTATIONS

### **File: `src/modules/translation/providers.js`**

```javascript
import { TranslationProvider, TranslationError } from './base-provider.js';

// ============ LANGBLY (Default Free Tier) ============

export class LangblyProvider extends TranslationProvider {
  async translate(regions, sourceLang, targetLang) {
    const prompt = this.buildPrompt(regions, sourceLang, targetLang);

    const response = await fetch('https://api.langbly.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'langbly-translate-default',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    await this.assertResponse(response);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const translations = this.parseJsonResponse(content, regions.length);
    return this.mapResults(regions, translations);
  }

  async assertResponse(response) {
    if (response.ok) return;
    const status = response.status;
    if (status === 401) throw new TranslationError('AUTH_ERROR', 'Invalid Langbly API key');
    if (status === 429) throw new TranslationError('RATE_LIMITED', 'Langbly rate limit reached');
    if (status === 402) throw new TranslationError('QUOTA_EXCEEDED', 'Langbly free tier quota exceeded');
    throw new TranslationError('API_ERROR', `Langbly error: HTTP ${status}`);
  }
}

// ============ OPENROUTER ============

export class OpenRouterProvider extends TranslationProvider {
  async translate(regions, sourceLang, targetLang) {
    const prompt = this.buildPrompt(regions, sourceLang, targetLang);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/zayn/mantra',
        'X-Title': 'Mantra Extension'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free', // Free tier model
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    await this.assertResponse(response);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return this.mapResults(regions, this.parseJsonResponse(content, regions.length));
  }

  async assertResponse(response) {
    if (response.ok) return;
    const status = response.status;
    if (status === 401) throw new TranslationError('AUTH_ERROR', 'Invalid OpenRouter API key');
    if (status === 402) throw new TranslationError('QUOTA_EXCEEDED', 'OpenRouter credits exhausted');
    if (status === 429) throw new TranslationError('RATE_LIMITED', 'OpenRouter rate limit reached');
    throw new TranslationError('API_ERROR', `OpenRouter error: HTTP ${status}`);
  }
}

// ============ GOOGLE GEMINI ============

export class GeminiProvider extends TranslationProvider {
  async translate(regions, sourceLang, targetLang) {
    const prompt = this.buildPrompt(regions, sourceLang, targetLang);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json' // Force JSON output
        }
      })
    });

    await this.assertResponse(response);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return this.mapResults(regions, this.parseJsonResponse(text, regions.length));
  }

  async assertResponse(response) {
    if (response.ok) return;
    const body = await response.json().catch(() => ({}));
    const status = response.status;
    if (status === 400) throw new TranslationError('API_ERROR', body?.error?.message || 'Invalid Gemini request');
    if (status === 401 || status === 403) throw new TranslationError('AUTH_ERROR', 'Invalid Gemini API key');
    if (status === 429) throw new TranslationError('RATE_LIMITED', 'Gemini rate limit reached');
    throw new TranslationError('API_ERROR', `Gemini error: HTTP ${status}`);
  }
}

// ============ OPENAI ============

export class OpenAIProvider extends TranslationProvider {
  async translate(regions, sourceLang, targetLang) {
    const prompt = this.buildPrompt(regions, sourceLang, targetLang);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a manga translator. Translate naturally and concisely.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' } // Note: requires "json" in prompt
      })
    });

    await this.assertResponse(response);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // OpenAI in JSON mode wraps in object; try array first, then object
    let translations;
    try {
      translations = this.parseJsonResponse(content, regions.length);
    } catch {
      const obj = JSON.parse(content);
      const key = Object.keys(obj).find(k => Array.isArray(obj[k]));
      translations = obj[key] || [];
      while (translations.length < regions.length) translations.push('');
    }
    return this.mapResults(regions, translations);
  }

  async assertResponse(response) {
    if (response.ok) return;
    const status = response.status;
    if (status === 401) throw new TranslationError('AUTH_ERROR', 'Invalid OpenAI API key');
    if (status === 429) throw new TranslationError('RATE_LIMITED', 'OpenAI rate limit / quota');
    throw new TranslationError('API_ERROR', `OpenAI error: HTTP ${status}`);
  }
}

// ============ ANTHROPIC CLAUDE ============

export class ClaudeProvider extends TranslationProvider {
  async translate(regions, sourceLang, targetLang) {
    const prompt = this.buildPrompt(regions, sourceLang, targetLang);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true' // Required for browser CORS
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2000,
        system: 'You are a manga translator. Translate naturally and concisely. Always respond with a JSON array of strings.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    await this.assertResponse(response);
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    return this.mapResults(regions, this.parseJsonResponse(text, regions.length));
  }

  async assertResponse(response) {
    if (response.ok) return;
    const status = response.status;
    if (status === 401) throw new TranslationError('AUTH_ERROR', 'Invalid Anthropic API key');
    if (status === 429) throw new TranslationError('RATE_LIMITED', 'Anthropic rate limit reached');
    throw new TranslationError('API_ERROR', `Claude error: HTTP ${status}`);
  }
}

// ============ DEEPSEEK ============

export class DeepSeekProvider extends TranslationProvider {
  async translate(regions, sourceLang, targetLang) {
    const prompt = this.buildPrompt(regions, sourceLang, targetLang);

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    });

    await this.assertResponse(response);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return this.mapResults(regions, this.parseJsonResponse(content, regions.length));
  }

  async assertResponse(response) {
    if (response.ok) return;
    const status = response.status;
    if (status === 401) throw new TranslationError('AUTH_ERROR', 'Invalid DeepSeek API key');
    if (status === 429) throw new TranslationError('RATE_LIMITED', 'DeepSeek rate limit reached');
    throw new TranslationError('API_ERROR', `DeepSeek error: HTTP ${status}`);
  }
}

// ============ FACTORY ============

const PROVIDER_REGISTRY = {
  langbly: LangblyProvider,
  openrouter: OpenRouterProvider,
  gemini: GeminiProvider,
  openai: OpenAIProvider,
  claude: ClaudeProvider,
  deepseek: DeepSeekProvider
};

export function createProvider(providerId, apiKey) {
  const Class = PROVIDER_REGISTRY[providerId];
  if (!Class) throw new TranslationError('UNKNOWN_PROVIDER', `Unknown provider: ${providerId}`);
  return new Class(apiKey);
}
```

---

## 5. TRANSLATION ORCHESTRATOR

### **File: `src/modules/translation/orchestrator.js`**

```javascript
import { detectLanguage } from '../lang-detect.js';
import { createProvider } from './providers.js';
import { TranslationError } from './base-provider.js';
import { TranslationCacheStore } from '../storage.js';
import { sortReadingOrder } from '../bubble-grouping.js';

/**
 * Orchestrate translation for OCR regions.
 * @param {Array} regions - OCR regions from Phase 3
 * @param {Object} options - { targetLang, providerId, apiKey, sourceLangFallback, autoDetect }
 * @returns {Promise<Array>} - regions enriched with translatedText
 */
export async function translateRegions(regions, options) {
  const {
    targetLang = 'id',
    providerId = 'langbly',
    apiKey,
    sourceLangFallback = 'ja',
    autoDetect = true
  } = options;

  if (regions.length === 0) return [];

  // Detect language per region (or use fallback)
  const enriched = regions.map(r => ({
    ...r,
    detectedLang: autoDetect ? detectLanguage(r.text, sourceLangFallback) : sourceLangFallback
  }));

  // Determine dominant language (used for prompt + cache key)
  const dominantLang = pickDominantLanguage(enriched, sourceLangFallback);

  // Sort into reading order for the dominant language
  const ordered = sortReadingOrder(enriched, dominantLang);

  // Check cache for each region
  const cacheResults = await Promise.all(
    ordered.map(r => TranslationCacheStore.get(r.text, dominantLang, targetLang))
  );

  const cachedMap = new Map();
  const uncached = [];
  ordered.forEach((r, i) => {
    if (cacheResults[i]) {
      cachedMap.set(r.id, cacheResults[i]);
    } else {
      uncached.push(r);
    }
  });

  let newTranslations = [];
  if (uncached.length > 0) {
    const provider = createProvider(providerId, apiKey);
    newTranslations = await provider.translate(uncached, dominantLang, targetLang);

    // Cache new translations
    await Promise.all(
      newTranslations.map(t => {
        const region = uncached.find(r => r.id === t.id);
        return TranslationCacheStore.set(region.text, dominantLang, targetLang, t.translatedText);
      })
    );
  }

  // Combine cached + new, preserving original order
  return ordered.map(r => {
    const cached = cachedMap.get(r.id);
    if (cached) {
      return { ...r, translatedText: cached, sourceLang: dominantLang, targetLang };
    }
    const fresh = newTranslations.find(t => t.id === r.id);
    return { ...r, translatedText: fresh?.translatedText || '', sourceLang: dominantLang, targetLang };
  });
}

function pickDominantLanguage(enriched, fallback) {
  const counts = {};
  for (const r of enriched) {
    counts[r.detectedLang] = (counts[r.detectedLang] || 0) + r.text.length;
  }
  let best = fallback;
  let max = 0;
  for (const [lang, count] of Object.entries(counts)) {
    if (count > max) {
      best = lang;
      max = count;
    }
  }
  return best;
}
```

---

## 6. TRANSLATION CACHE

### **Add to `src/modules/storage.js`:**

```javascript
const STORE_TRANSLATION_CACHE = 'translationCache';

// In getDB upgrade:
if (!db.objectStoreNames.contains(STORE_TRANSLATION_CACHE)) {
  const store = db.createObjectStore(STORE_TRANSLATION_CACHE, { keyPath: 'key' });
  store.createIndex('cachedAt', 'cachedAt');
}

export const TranslationCacheStore = {
  async hashKey(text, sourceLang, targetLang) {
    const data = `${sourceLang}::${targetLang}::${text}`;
    const buffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
  },

  async get(text, sourceLang, targetLang) {
    const key = await this.hashKey(text, sourceLang, targetLang);
    const db = await getDB();
    const entry = await db.get(STORE_TRANSLATION_CACHE, key);
    if (!entry) return null;
    // Expire after 30 days
    if (Date.now() - new Date(entry.cachedAt).getTime() > 30 * 24 * 60 * 60 * 1000) {
      await db.delete(STORE_TRANSLATION_CACHE, key);
      return null;
    }
    return entry.translatedText;
  },

  async set(text, sourceLang, targetLang, translatedText) {
    const key = await this.hashKey(text, sourceLang, targetLang);
    const db = await getDB();
    await db.put(STORE_TRANSLATION_CACHE, {
      key,
      translatedText,
      cachedAt: new Date().toISOString()
    });
  },

  async clear() {
    const db = await getDB();
    await db.clear(STORE_TRANSLATION_CACHE);
  }
};
```

---

## 7. BACKGROUND WIRING

### **Add to `src/background.js`:**

```javascript
import { translateRegions } from './modules/translation/orchestrator.js';
import { TranslationError } from './modules/translation/base-provider.js';
import { ApiKeyStore, SettingsStore } from './modules/storage.js';

if (request.action === 'translateRegions') {
  handleTranslationRequest(request).then(sendResponse);
  return true;
}

async function handleTranslationRequest(request) {
  try {
    const settings = await SettingsStore.getAll();
    const providerId = settings.translationProvider;
    const apiKey = await ApiKeyStore.get(providerId);

    if (!apiKey) {
      return {
        success: false,
        errorCode: 'NO_API_KEY',
        error: `${providerId} API key not configured. Set it in Settings → API Keys.`
      };
    }

    const translated = await translateRegions(request.regions, {
      targetLang: settings.targetLanguage,
      providerId,
      apiKey,
      sourceLangFallback: settings.sourceLanguageFallback,
      autoDetect: settings.autoDetectLanguage
    });

    return { success: true, translatedRegions: translated };
  } catch (error) {
    if (error instanceof TranslationError) {
      return { success: false, errorCode: error.code, error: error.message };
    }
    return { success: false, errorCode: 'UNKNOWN', error: error.message };
  }
}
```

---

## 8. CONTENT SCRIPT — Wire to OCR

### **In `src/content-script.js`, listen for OCR completion:**

```javascript
window.addEventListener('mantra:ocr-complete', async (event) => {
  const { imgElement, imageBlob, ocrResult } = event.detail;

  // Skip if no text found
  if (ocrResult.regions.length === 0) return;

  // Request translation
  const response = await chrome.runtime.sendMessage({
    action: 'translateRegions',
    regions: ocrResult.regions
  });

  if (!response.success) {
    handleTranslationError(response);
    return;
  }

  showToast(`Translated ${response.translatedRegions.length} region(s). Rendering...`, 'success');

  // Hand off to canvas rendering (Phase 5)
  window.dispatchEvent(new CustomEvent('mantra:translation-complete', {
    detail: {
      imgElement,
      imageBlob,
      regions: response.translatedRegions
    }
  }));
});

function handleTranslationError(response) {
  switch (response.errorCode) {
    case 'NO_API_KEY':
      showToast('Set translation provider API key in Settings.', 'error');
      break;
    case 'AUTH_ERROR':
      showToast('Invalid API key for translation provider. Check Settings.', 'error');
      break;
    case 'QUOTA_EXCEEDED':
      showToast('Translation quota exceeded. Try a different provider in Settings.', 'error');
      break;
    case 'RATE_LIMITED':
      showToast('Rate limited. Wait a moment and try again.', 'error');
      break;
    case 'PARSE_ERROR':
      showToast('Translation response was malformed. Try again or switch provider.', 'error');
      break;
    default:
      showToast(`Translation failed: ${response.error}`, 'error');
  }
}
```

---

## 9. PROMPT QUALITY NOTES

The prompt in `base-provider.js` is intentionally:
- **Compact** — under 200 tokens of instruction
- **Format-strict** — demands JSON array, no commentary
- **Manga-aware** — mentions onomatopoeia and emotional preservation
- **Numbered** — uses 1-based indexing so the model knows positional alignment

**Tested patterns that work better:**
- Always include "ONLY a JSON array" twice in the prompt
- Provide an explicit example output format
- Use `temperature: 0.3` for consistency (not 0.7 which causes drift)

**Patterns that fail:**
- "Translate and explain" — bloats output
- Multi-turn conversation — increases parsing failures
- Free-form "translate naturally" without format constraint — model often adds preamble

---

## 10. ACCEPTANCE TESTS

| # | Test | Expected |
|---|------|----------|
| 1 | OCR detects 5 Japanese regions → translate to Indonesian | All 5 regions translated, JSON parsed correctly |
| 2 | Mix Japanese + English in same image | Dominant language used, translations consistent |
| 3 | Same image translated twice within 30 days | Second time hits cache (no API call) |
| 4 | Switch provider from Langbly to Gemini | Next translation uses Gemini |
| 5 | Provider returns malformed JSON | Fallback to padded empty strings, no crash |
| 6 | Provider returns 401 (invalid key) | Toast: "Invalid API key" with provider name |
| 7 | Provider returns 429 (rate limit) | Toast: "Rate limited. Wait and try again." |
| 8 | Very short text (e.g. "！") | Uses fallback language (ja), translates correctly |
| 9 | 20 regions in single image | One batched API call, all translated |
| 10 | Network drops during translation | Error handled, toast shown |

---

## 11. DELIVERABLES

✅ `src/modules/lang-detect.js` — francjs + CJK heuristics
✅ `src/modules/translation/base-provider.js` — Provider base class
✅ `src/modules/translation/providers.js` — All 6 provider implementations
✅ `src/modules/translation/orchestrator.js` — Batch + cache orchestration
✅ Updated `src/modules/storage.js` — TranslationCacheStore
✅ Updated `src/background.js` — translation message handler
✅ Updated `src/content-script.js` — Wire OCR → Translation → Canvas pipeline
✅ Manga-aware prompt template (tested across all providers)

**Next Phase:** Feature 05 — Canvas Rendering (Perfect Positioning)
