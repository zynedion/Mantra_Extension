import { describe, it, expect } from 'vitest';
import { detectLanguage } from '../src/modules/lang-detect.js';

describe('Language Detector Module', () => {
  it('detects Japanese text using kana heuristics', () => {
    expect(detectLanguage('こんにちは世界')).toBe('ja');
    expect(detectLanguage('やはり俺の青春ラブコメはまちがっている。')).toBe('ja');
  });

  it('detects Korean text using hangul heuristics', () => {
    expect(detectLanguage('안녕하세요 세계')).toBe('ko');
  });

  it('detects Chinese text containing CJK characters', () => {
    expect(detectLanguage('你好，这是一个测试')).toBe('zh');
  });

  it('detects English text using franc', () => {
    expect(detectLanguage('This is a longer English sentence for test')).toBe('en');
  });

  it('falls back to default fallback language for short or ambiguous inputs', () => {
    expect(detectLanguage('!', 'ja')).toBe('ja');
    expect(detectLanguage('test', 'en')).toBe('en');
  });
});
