import React from 'react';

// Target languages (what you want to read in)
const LANGUAGES = [
  // Southeast Asia
  { code: 'id', label: 'Indonesian' },
  { code: 'ms', label: 'Malay' },
  { code: 'tl', label: 'Filipino / Tagalog' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'th', label: 'Thai' },
  { code: 'my', label: 'Burmese' },
  { code: 'km', label: 'Khmer' },
  // East Asia
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese (Simplified)' },
  { code: 'zh-TW', label: 'Chinese (Traditional)' },
  { code: 'ko', label: 'Korean' },
  // South Asia
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ur', label: 'Urdu' },
  // Europe
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'ru', label: 'Russian' },
  { code: 'tr', label: 'Turkish' },
  // Middle East
  { code: 'ar', label: 'Arabic' },
  { code: 'fa', label: 'Persian / Farsi' },
  { code: 'he', label: 'Hebrew' },
];

// Fallback source language options (what language the manga is written in)
const SOURCE_FALLBACKS = [
  // Most common manga/manhwa/manhua sources
  { code: 'ja', label: '🇯🇵 Japanese — manga' },
  { code: 'zh', label: '🇨🇳 Chinese Simplified — manhua' },
  { code: 'zh-TW', label: '🇹🇼 Chinese Traditional — manhua' },
  { code: 'ko', label: '🇰🇷 Korean — manhwa' },
  // Less common but supported
  { code: 'th', label: '🇹🇭 Thai' },
  { code: 'vi', label: '🇻🇳 Vietnamese' },
  { code: 'id', label: '🇮🇩 Indonesian' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 French — BD / bande dessinée' },
  { code: 'es', label: '🇪🇸 Spanish' },
  { code: 'de', label: '🇩🇪 German' },
  { code: 'pt', label: '🇵🇹 Portuguese' },
  { code: 'ru', label: '🇷🇺 Russian' },
  { code: 'ar', label: '🇸🇦 Arabic' },
];


export default function TranslationTab({ settings, updateSetting }) {
  return (
    <div className="tab-pane">
      <h2>Translation Settings</h2>

      <section className="setting-group">
        <label>Target Language</label>
        <select
          value={settings.targetLanguage}
          onChange={(e) => updateSetting('targetLanguage', e.target.value)}
        >
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        <p className="hint">Translations will be rendered in this language.</p>
      </section>

      <section className="setting-group">
        <div className="setting-row">
          <label>Auto-detect Source Language</label>
          <Toggle
            value={settings.autoDetectLanguage}
            onChange={(v) => updateSetting('autoDetectLanguage', v)}
          />
        </div>
        <p className="hint">Use language detection to discover the source language automatically.</p>
      </section>

      {settings.autoDetectLanguage && (
        <section className="setting-group">
          <label>Fallback Source Language</label>
          <select
            value={settings.sourceLanguageFallback}
            onChange={(e) => updateSetting('sourceLanguageFallback', e.target.value)}
          >
            {SOURCE_FALLBACKS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <p className="hint">Used when text is too short to detect (less than 5 characters).</p>
        </section>
      )}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      className={`toggle ${value ? 'active' : ''}`}
      onClick={() => onChange(!value)}
      aria-pressed={value}
      type="button"
    >
      <span className="knob" />
    </button>
  );
}
