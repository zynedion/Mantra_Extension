import { franc } from 'franc';

const FRANC_TO_ISO = {
  jpn: 'ja',
  cmn: 'zh',
  yue: 'zh',
  zho: 'zh',
  kor: 'ko',
  eng: 'en',
  ind: 'id',
  spa: 'es',
  fra: 'fr',
  deu: 'de'
};

export function detectLanguage(text, fallbackLang = 'ja') {
  const cleaned = text.trim();
  if (cleaned.length < 5) return fallbackLang;

  if (containsJapaneseKana(cleaned)) return 'ja';
  if (containsHangul(cleaned)) return 'ko';

  const code = franc(cleaned, { minLength: 5 });
  const iso = FRANC_TO_ISO[code];

  if (!iso || code === 'und') {
    if (containsCJK(cleaned)) return 'zh';
    return fallbackLang;
  }
  return iso;
}

function containsJapaneseKana(text) {
  return /[\u3040-\u30FF]/.test(text);
}

function containsHangul(text) {
  return /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text);
}

function containsCJK(text) {
  return /[\u4E00-\u9FFF]/.test(text);
}
