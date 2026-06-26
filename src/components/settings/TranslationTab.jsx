import React from 'react';

const LANGUAGES = [
  { code: 'id', label: 'Indonesian' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese (Simplified)' },
  { code: 'ko', label: 'Korean' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' }
];

const SOURCE_FALLBACKS = [
  { code: 'ja', label: 'Japanese (default for manga)' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ko', label: 'Korean' }
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
