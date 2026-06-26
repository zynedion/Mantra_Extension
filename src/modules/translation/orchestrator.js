import { detectLanguage } from '../lang-detect.js';
import { createProvider } from './providers.js';
import { TranslationCacheStore } from '../storage.js';
import { sortReadingOrder } from '../bubble-grouping.js';

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
    if (cacheResults[i] !== null) {
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
        if (region) {
          return TranslationCacheStore.set(region.text, dominantLang, targetLang, t.translatedText);
        }
        return Promise.resolve();
      })
    );
  }

  // Combine cached + new, preserving sorted reading order
  return ordered.map(r => {
    const cached = cachedMap.get(r.id);
    if (cached !== undefined) {
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
