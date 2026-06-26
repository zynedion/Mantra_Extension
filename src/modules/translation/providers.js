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
        model: 'meta-llama/llama-3.1-8b-instruct:free',
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
          responseMimeType: 'application/json'
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
        response_format: { type: 'json_object' }
      })
    });

    await this.assertResponse(response);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

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
        'anthropic-dangerous-direct-browser-access': 'true'
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
    if (status === 429) throw new TranslationError('RATE_LIMITED', 'DeepSeek rate limit reached'); // Map Claude rate limit code
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

export { TranslationError };
