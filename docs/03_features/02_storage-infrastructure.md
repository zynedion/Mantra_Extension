# Feature 02: Storage Infrastructure & Settings Management
## Phase 2 — Foundation Layer

**Objective:** Build storage abstraction layer for settings (chrome.storage.sync) and translation history (IndexedDB), plus implement full settings UI with API key management.

**Timeline:** 2-3 days
**Dependencies:** Phase 1 complete (extension shell working)

**Acceptance Criteria:**
- ✅ Settings persist across browser restarts
- ✅ API keys stored securely in chrome.storage.sync
- ✅ IndexedDB initialized and CRUD-ready for translations
- ✅ Settings page fully functional (all 5 tabs)
- ✅ "Test Connection" button validates API keys
- ✅ Reset to defaults button works

---

## 1. STORAGE ABSTRACTION LAYER

### **File: `src/modules/storage.js`**

```javascript
/**
 * Unified Storage Manager
 * Handles both chrome.storage.sync (settings, API keys) and IndexedDB (history)
 */

import { openDB } from 'idb';

const DB_NAME = 'MantraDB';
const DB_VERSION = 1;
const STORE_TRANSLATIONS = 'translations';

// ============ DEFAULT SETTINGS ============

export const DEFAULT_SETTINGS = {
  // General
  enabledOnAllPages: true,
  iconOpacity: 0.3,

  // Translation
  targetLanguage: 'id',
  autoDetectLanguage: true,
  sourceLanguageFallback: 'ja',

  // Appearance / Canvas
  fontSize: 16,
  fontFamily: 'WildWords',
  fontColor: '#000000',
  strokeColor: '#ffffff',
  strokeSize: 2,
  textAlignment: 'center',
  lineSpacing: 100,
  letterSpacing: 0,
  borderRadius: 8,
  borderPadding: 4,

  // History
  autoSave: true,
  autoDeleteAge: 'never', // '1day' | '1week' | '1month' | 'never'
  maxHistoryEntries: 500,

  // Theme
  theme: 'dark',

  // API Provider
  translationProvider: 'langbly', // 'langbly' | 'openrouter' | 'gemini' | 'openai' | 'claude' | 'deepseek'
};

export const SUPPORTED_PROVIDERS = [
  'googleCloud',
  'langbly',
  'openrouter',
  'gemini',
  'openai',
  'claude',
  'deepseek'
];

// ============ SETTINGS (chrome.storage.sync) ============

export const SettingsStore = {
  async getAll() {
    const { settings } = await chrome.storage.sync.get('settings');
    return { ...DEFAULT_SETTINGS, ...(settings || {}) };
  },

  async get(key) {
    const all = await this.getAll();
    return all[key];
  },

  async set(key, value) {
    const all = await this.getAll();
    all[key] = value;
    await chrome.storage.sync.set({ settings: all });
    return value;
  },

  async setMany(partial) {
    const all = await this.getAll();
    const updated = { ...all, ...partial };
    await chrome.storage.sync.set({ settings: updated });
    return updated;
  },

  async reset() {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
    return DEFAULT_SETTINGS;
  }
};

// ============ API KEYS (chrome.storage.sync, separate namespace) ============

export const ApiKeyStore = {
  async get(provider) {
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    const { apiKeys } = await chrome.storage.sync.get('apiKeys');
    return apiKeys?.[provider]?.key || null;
  },

  async getMetadata(provider) {
    const { apiKeys } = await chrome.storage.sync.get('apiKeys');
    return apiKeys?.[provider] || null;
  },

  async set(provider, key) {
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    const { apiKeys = {} } = await chrome.storage.sync.get('apiKeys');
    apiKeys[provider] = {
      key,
      lastTested: null,
      isValid: null,
      savedAt: new Date().toISOString()
    };
    await chrome.storage.sync.set({ apiKeys });
  },

  async markTested(provider, isValid) {
    const { apiKeys = {} } = await chrome.storage.sync.get('apiKeys');
    if (apiKeys[provider]) {
      apiKeys[provider].lastTested = new Date().toISOString();
      apiKeys[provider].isValid = isValid;
      await chrome.storage.sync.set({ apiKeys });
    }
  },

  async remove(provider) {
    const { apiKeys = {} } = await chrome.storage.sync.get('apiKeys');
    delete apiKeys[provider];
    await chrome.storage.sync.set({ apiKeys });
  },

  async listConfigured() {
    const { apiKeys = {} } = await chrome.storage.sync.get('apiKeys');
    return Object.keys(apiKeys).filter(p => apiKeys[p]?.key);
  }
};

// ============ INDEXEDDB (Translation History) ============

let dbInstance = null;

async function getDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_TRANSLATIONS)) {
        const store = db.createObjectStore(STORE_TRANSLATIONS, {
          keyPath: 'id'
        });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('siteUrl', 'siteUrl');
      }
    }
  });
  return dbInstance;
}

export const HistoryStore = {
  async save(entry) {
    const db = await getDB();
    const record = {
      id: entry.id || crypto.randomUUID(),
      originalImageBlob: entry.originalImageBlob,
      translatedImageBlob: entry.translatedImageBlob,
      originalText: entry.originalText || '',
      translatedText: entry.translatedText || '',
      siteUrl: entry.siteUrl || '',
      sourceLang: entry.sourceLang || 'ja',
      targetLang: entry.targetLang || 'id',
      translationModel: entry.translationModel || 'langbly',
      canvasSettings: entry.canvasSettings || {},
      createdAt: new Date().toISOString()
    };
    await db.put(STORE_TRANSLATIONS, record);

    // Enforce max history limit
    await this.enforceLimit();
    return record.id;
  },

  async getById(id) {
    const db = await getDB();
    return await db.get(STORE_TRANSLATIONS, id);
  },

  async getRecent(limit = 20, offset = 0) {
    const db = await getDB();
    const tx = db.transaction(STORE_TRANSLATIONS, 'readonly');
    const index = tx.store.index('createdAt');
    const all = await index.getAll();
    // Sort descending by createdAt
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return all.slice(offset, offset + limit);
  },

  async getAll() {
    const db = await getDB();
    const all = await db.getAll(STORE_TRANSLATIONS);
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return all;
  },

  async count() {
    const db = await getDB();
    return await db.count(STORE_TRANSLATIONS);
  },

  async delete(id) {
    const db = await getDB();
    await db.delete(STORE_TRANSLATIONS, id);
  },

  async clear() {
    const db = await getDB();
    await db.clear(STORE_TRANSLATIONS);
  },

  async enforceLimit() {
    const max = (await SettingsStore.get('maxHistoryEntries')) || 500;
    const count = await this.count();
    if (count <= max) return;

    // Delete oldest entries beyond the limit
    const all = await this.getAll(); // sorted desc
    const toDelete = all.slice(max); // older ones beyond max
    const db = await getDB();
    const tx = db.transaction(STORE_TRANSLATIONS, 'readwrite');
    for (const entry of toDelete) {
      await tx.store.delete(entry.id);
    }
    await tx.done;
  },

  async runAutoDelete() {
    const age = await SettingsStore.get('autoDeleteAge');
    if (age === 'never') return 0;

    const cutoffMs = {
      '1day': 24 * 60 * 60 * 1000,
      '1week': 7 * 24 * 60 * 60 * 1000,
      '1month': 30 * 24 * 60 * 60 * 1000
    }[age];

    if (!cutoffMs) return 0;

    const cutoff = Date.now() - cutoffMs;
    const all = await this.getAll();
    const toDelete = all.filter(e => new Date(e.createdAt).getTime() < cutoff);

    const db = await getDB();
    const tx = db.transaction(STORE_TRANSLATIONS, 'readwrite');
    for (const entry of toDelete) {
      await tx.store.delete(entry.id);
    }
    await tx.done;

    return toDelete.length;
  }
};
```

---

## 2. AUTO-DELETE BACKGROUND ALARM

### **In `src/background.js`** — add at top:

```javascript
import { HistoryStore } from './modules/storage.js';

// Schedule daily auto-delete check
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('mantra-auto-delete', {
    periodInMinutes: 60 * 24 // Daily
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'mantra-auto-delete') {
    const deletedCount = await HistoryStore.runAutoDelete();
    console.log(`[Mantra] Auto-deleted ${deletedCount} old entries`);
  }
});
```

**Add to `manifest.json` permissions:**
```json
"permissions": ["storage", "tabs", "activeTab", "scripting", "alarms"]
```

---

## 3. SETTINGS PAGE — FULL UI

Replace the Phase 1 skeleton with full functional tabs.

### **File: `src/options.jsx`**

```jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { SettingsStore, ApiKeyStore, HistoryStore, DEFAULT_SETTINGS } from './modules/storage.js';
import ApiKeysTab from './components/settings/ApiKeysTab.jsx';
import TranslationTab from './components/settings/TranslationTab.jsx';
import AppearanceTab from './components/settings/AppearanceTab.jsx';
import HistoryTab from './components/settings/HistoryTab.jsx';
import AboutTab from './components/settings/AboutTab.jsx';

const TABS = [
  { id: 'api', label: 'API Keys' },
  { id: 'translation', label: 'Translation' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'history', label: 'History' },
  { id: 'about', label: 'About' }
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('api');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SettingsStore.getAll().then(s => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const updateSetting = async (key, value) => {
    await SettingsStore.set(key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = async () => {
    if (!confirm('Reset all settings to defaults? API keys will NOT be removed.')) return;
    const defaults = await SettingsStore.reset();
    setSettings(defaults);
  };

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="settings-container">
      <header className="settings-header">
        <div className="logo-block">
          <img src="../public/icons/icon-48.png" alt="Mantra" />
          <h1>Mantra Settings</h1>
        </div>
        <button className="btn btn-secondary" onClick={handleReset}>
          Reset Defaults
        </button>
      </header>

      <div className="settings-body">
        <nav className="tab-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="tab-content">
          {activeTab === 'api' && <ApiKeysTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'translation' && <TranslationTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'appearance' && <AppearanceTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'history' && <HistoryTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'about' && <AboutTab />}
        </main>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SettingsPage />);
```

### **File: `src/components/settings/ApiKeysTab.jsx`**

```jsx
import React, { useState, useEffect } from 'react';
import { ApiKeyStore } from '../../modules/storage.js';

const PROVIDERS = [
  { id: 'googleCloud', label: 'Google Cloud Vision', placeholder: 'AIza...', getKeyUrl: 'https://console.cloud.google.com/apis/credentials', required: true },
  { id: 'langbly', label: 'Langbly (Free Tier)', placeholder: 'lb-...', getKeyUrl: 'https://langbly.com/docs/' },
  { id: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-v1-...', getKeyUrl: 'https://openrouter.ai/keys' },
  { id: 'gemini', label: 'Google Gemini', placeholder: 'AIzaSy...', getKeyUrl: 'https://aistudio.google.com/apikey' },
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-proj-...', getKeyUrl: 'https://platform.openai.com/api-keys' },
  { id: 'claude', label: 'Anthropic Claude', placeholder: 'sk-ant-...', getKeyUrl: 'https://console.anthropic.com/' },
  { id: 'deepseek', label: 'DeepSeek', placeholder: 'sk-...', getKeyUrl: 'https://platform.deepseek.com/' }
];

export default function ApiKeysTab({ settings, updateSetting }) {
  const [keys, setKeys] = useState({});
  const [testing, setTesting] = useState({});
  const [revealedKeys, setRevealedKeys] = useState({});

  useEffect(() => {
    Promise.all(PROVIDERS.map(async p => {
      const meta = await ApiKeyStore.getMetadata(p.id);
      return [p.id, meta];
    })).then(entries => {
      setKeys(Object.fromEntries(entries));
    });
  }, []);

  const handleKeyChange = async (providerId, value) => {
    await ApiKeyStore.set(providerId, value);
    const meta = await ApiKeyStore.getMetadata(providerId);
    setKeys(prev => ({ ...prev, [providerId]: meta }));
  };

  const handleTestConnection = async (providerId) => {
    setTesting(prev => ({ ...prev, [providerId]: true }));
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'testApiKey',
        provider: providerId
      });
      await ApiKeyStore.markTested(providerId, response.success);
      const meta = await ApiKeyStore.getMetadata(providerId);
      setKeys(prev => ({ ...prev, [providerId]: meta }));
    } finally {
      setTesting(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleRemove = async (providerId) => {
    if (!confirm(`Remove ${PROVIDERS.find(p => p.id === providerId).label} API key?`)) return;
    await ApiKeyStore.remove(providerId);
    setKeys(prev => ({ ...prev, [providerId]: null }));
  };

  const toggleReveal = (providerId) => {
    setRevealedKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  return (
    <div className="tab-pane">
      <h2>API Keys</h2>
      <p className="hint">
        Your keys are stored securely in Chrome and never sent to any server except the provider directly.
      </p>

      <section className="setting-group">
        <h3>Active Translation Provider</h3>
        <select
          value={settings.translationProvider}
          onChange={(e) => updateSetting('translationProvider', e.target.value)}
        >
          {PROVIDERS.filter(p => p.id !== 'googleCloud').map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <p className="hint">This provider will be used for translation requests.</p>
      </section>

      <section className="setting-group">
        {PROVIDERS.map(provider => {
          const meta = keys[provider.id];
          const hasKey = !!meta?.key;
          const isRevealed = revealedKeys[provider.id];
          const isTesting = testing[provider.id];

          return (
            <div key={provider.id} className="api-key-row">
              <div className="api-key-header">
                <label>
                  {provider.label}
                  {provider.required && <span className="required-badge">Required</span>}
                </label>
                <a href={provider.getKeyUrl} target="_blank" rel="noopener noreferrer" className="get-key-link">
                  Get Key ↗
                </a>
              </div>
              <div className="api-key-input-row">
                <input
                  type={isRevealed ? 'text' : 'password'}
                  placeholder={provider.placeholder}
                  value={meta?.key || ''}
                  onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                />
                <button type="button" className="btn-icon" onClick={() => toggleReveal(provider.id)} title={isRevealed ? 'Hide' : 'Show'}>
                  {isRevealed ? '🙈' : '👁'}
                </button>
              </div>
              {hasKey && (
                <div className="api-key-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleTestConnection(provider.id)}
                    disabled={isTesting}
                  >
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRemove(provider.id)}
                  >
                    Remove
                  </button>
                  {meta?.lastTested && (
                    <span className={`status ${meta.isValid ? 'status-success' : 'status-error'}`}>
                      {meta.isValid ? '✓ Valid' : '✗ Invalid'} (tested {new Date(meta.lastTested).toLocaleDateString()})
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
```

### **File: `src/components/settings/TranslationTab.jsx`**

```jsx
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
        <p className="hint">Use francjs library to detect source language automatically.</p>
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
    >
      <span className="knob" />
    </button>
  );
}
```

### **File: `src/components/settings/AppearanceTab.jsx`**

```jsx
import React from 'react';

const FONTS = [
  { value: 'WildWords', label: 'WildWords (clean, modern)', googleName: 'Fredoka One' },
  { value: 'Heroika', label: 'Heroika (bold)', googleName: 'Fredoka' },
  { value: 'Shonen', label: 'Shonen (classic manga)', googleName: 'Fredoka Mono' },
  { value: 'KomikaJam', label: 'Komika Jam (playful)', googleName: 'Comfortaa' },
  { value: 'Bangers', label: 'Bangers (action)', googleName: 'Bangers' }
];

const ALIGNMENTS = ['left', 'center', 'right'];

export default function AppearanceTab({ settings, updateSetting }) {
  return (
    <div className="tab-pane">
      <h2>Appearance</h2>

      <section className="setting-group">
        <label>Font Family</label>
        <select
          value={settings.fontFamily}
          onChange={(e) => updateSetting('fontFamily', e.target.value)}
        >
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <div className="font-preview" style={{ fontFamily: FONTS.find(f => f.value === settings.fontFamily)?.googleName }}>
          The quick brown fox jumps
        </div>
      </section>

      <SliderRow label="Font Size" min={6} max={48} unit="px" value={settings.fontSize} onChange={(v) => updateSetting('fontSize', v)} />

      <section className="setting-group setting-row">
        <label>Font Color</label>
        <input type="color" value={settings.fontColor} onChange={(e) => updateSetting('fontColor', e.target.value)} />
      </section>

      <section className="setting-group setting-row">
        <label>Stroke Color</label>
        <input type="color" value={settings.strokeColor} onChange={(e) => updateSetting('strokeColor', e.target.value)} />
      </section>

      <SliderRow label="Stroke Size" min={0} max={10} unit="px" value={settings.strokeSize} onChange={(v) => updateSetting('strokeSize', v)} />

      <section className="setting-group">
        <label>Text Alignment</label>
        <div className="button-group">
          {ALIGNMENTS.map(a => (
            <button
              key={a}
              className={`align-btn ${settings.textAlignment === a ? 'active' : ''}`}
              onClick={() => updateSetting('textAlignment', a)}
            >
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <SliderRow label="Line Spacing" min={50} max={200} unit="%" value={settings.lineSpacing} onChange={(v) => updateSetting('lineSpacing', v)} />
      <SliderRow label="Letter Spacing" min={-2} max={10} unit="px" value={settings.letterSpacing} onChange={(v) => updateSetting('letterSpacing', v)} />
      <SliderRow label="Border Radius" min={0} max={20} unit="px" value={settings.borderRadius} onChange={(v) => updateSetting('borderRadius', v)} />
      <SliderRow label="Border Padding" min={0} max={20} unit="px" value={settings.borderPadding} onChange={(v) => updateSetting('borderPadding', v)} />
      <SliderRow label="Floating Icon Opacity" min={0.1} max={1} step={0.1} unit="" value={settings.iconOpacity} onChange={(v) => updateSetting('iconOpacity', v)} />
    </div>
  );
}

function SliderRow({ label, min, max, step = 1, unit, value, onChange }) {
  return (
    <section className="setting-group">
      <div className="slider-header">
        <label>{label}</label>
        <span className="slider-value">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </section>
  );
}
```

### **File: `src/components/settings/HistoryTab.jsx`**

```jsx
import React, { useEffect, useState } from 'react';
import { HistoryStore } from '../../modules/storage.js';

const AUTO_DELETE_OPTIONS = [
  { value: '1day', label: '1 day' },
  { value: '1week', label: '1 week' },
  { value: '1month', label: '1 month' },
  { value: 'never', label: 'Never' }
];

export default function HistoryTab({ settings, updateSetting }) {
  const [count, setCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    HistoryStore.count().then(setCount);
  }, []);

  const handleClear = async () => {
    if (!confirm(`Delete ALL ${count} translations? This cannot be undone.`)) return;
    await HistoryStore.clear();
    setCount(0);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await chrome.runtime.sendMessage({ action: 'exportHistoryAsZip' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="tab-pane">
      <h2>History</h2>

      <section className="setting-group setting-row">
        <label>Auto-save translations</label>
        <Toggle value={settings.autoSave} onChange={(v) => updateSetting('autoSave', v)} />
      </section>

      <section className="setting-group">
        <label>Auto-delete after</label>
        <select
          value={settings.autoDeleteAge}
          onChange={(e) => updateSetting('autoDeleteAge', e.target.value)}
        >
          {AUTO_DELETE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <p className="hint">Translations older than this will be automatically deleted daily.</p>
      </section>

      <section className="setting-group">
        <div className="stats-card">
          <span className="stats-number">{count}</span>
          <span className="stats-label">translations stored ({Math.round(count / 500 * 100)}% of 500 limit)</span>
        </div>
      </section>

      <section className="setting-group setting-row">
        <button className="btn btn-primary" onClick={handleExport} disabled={exporting || count === 0}>
          {exporting ? 'Exporting...' : `Export All as ZIP`}
        </button>
        <button className="btn btn-danger" onClick={handleClear} disabled={count === 0}>
          Clear All History
        </button>
      </section>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button className={`toggle ${value ? 'active' : ''}`} onClick={() => onChange(!value)} aria-pressed={value}>
      <span className="knob" />
    </button>
  );
}
```

### **File: `src/components/settings/AboutTab.jsx`**

```jsx
import React from 'react';

export default function AboutTab() {
  return (
    <div className="tab-pane about-pane">
      <img src="../public/icons/icon-128.png" alt="Mantra" className="about-logo" />
      <h2>Mantra</h2>
      <p className="version">Version 1.0.0</p>
      <p className="description">
        A personal manga translator extension built with care for readers who want frictionless translation.
      </p>
      <div className="about-links">
        <a href="https://github.com/zayn/mantra" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="https://github.com/zayn/mantra/issues" target="_blank" rel="noopener noreferrer">Report Issue</a>
      </div>
      <p className="credits">
        Built by Zayn. Powered by Google Cloud Vision and your chosen LLM provider.
      </p>
    </div>
  );
}
```

---

## 4. BACKGROUND HANDLER — Test API Key

### **Add to `src/background.js`:**

```javascript
import { ApiKeyStore } from './modules/storage.js';

// Inside the message listener
if (request.action === 'testApiKey') {
  testApiKey(request.provider).then(sendResponse);
  return true;
}

async function testApiKey(provider) {
  const key = await ApiKeyStore.get(provider);
  if (!key) return { success: false, error: 'No key configured' };

  try {
    switch (provider) {
      case 'googleCloud':
        return await testGoogleCloud(key);
      case 'langbly':
        return await testLangbly(key);
      case 'openrouter':
        return await testOpenRouter(key);
      case 'gemini':
        return await testGemini(key);
      case 'openai':
        return await testOpenAI(key);
      case 'claude':
        return await testClaude(key);
      case 'deepseek':
        return await testDeepSeek(key);
      default:
        return { success: false, error: 'Unknown provider' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testGoogleCloud(key) {
  // Minimal call: 1x1 pixel base64 image
  const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ image: { content: tinyPng }, features: [{ type: 'TEXT_DETECTION' }] }]
    })
  });
  return { success: res.ok, status: res.status };
}

async function testLangbly(key) {
  // Reference: https://langbly.com/docs/
  const res = await fetch('https://api.langbly.com/v1/health', {
    headers: { 'Authorization': `Bearer ${key}` }
  });
  return { success: res.ok, status: res.status };
}

async function testOpenRouter(key) {
  const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
    headers: { 'Authorization': `Bearer ${key}` }
  });
  return { success: res.ok, status: res.status };
}

async function testGemini(key) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  return { success: res.ok, status: res.status };
}

async function testOpenAI(key) {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { 'Authorization': `Bearer ${key}` }
  });
  return { success: res.ok, status: res.status };
}

async function testClaude(key) {
  // Minimal completion call
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }]
    })
  });
  return { success: res.ok, status: res.status };
}

async function testDeepSeek(key) {
  const res = await fetch('https://api.deepseek.com/models', {
    headers: { 'Authorization': `Bearer ${key}` }
  });
  return { success: res.ok, status: res.status };
}
```

---

## 5. POPUP — Wire Up Real State

### **Update `src/popup.jsx`:**

```jsx
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { SettingsStore, HistoryStore } from './modules/storage.js';

export default function Popup() {
  const [enabled, setEnabled] = useState(true);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    SettingsStore.get('enabledOnAllPages').then(setEnabled);
    HistoryStore.getRecent(3).then(setRecent);
  }, []);

  const handleToggle = async () => {
    const newState = !enabled;
    setEnabled(newState);
    await SettingsStore.set('enabledOnAllPages', newState);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleExtension', enabled: newState });
    });
  };

  return (
    <div className="popup">
      <header className="popup-header">
        <img src="../public/icons/icon-48.png" alt="Mantra" width="24" height="24" />
        <h1>Mantra</h1>
      </header>

      <div className="popup-content">
        <div className="setting-row">
          <label>Enable on this page</label>
          <button className={`toggle ${enabled ? 'active' : ''}`} onClick={handleToggle}>
            <span className="knob" />
          </button>
        </div>

        <h2 className="section-label">Recent Translations</h2>
        {recent.length === 0 ? (
          <p className="muted">No translations yet</p>
        ) : (
          <div className="thumbnail-grid">
            {recent.map(entry => (
              <div key={entry.id} className="thumbnail">
                <img src={URL.createObjectURL(entry.translatedImageBlob)} alt="" />
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="popup-footer">
        <button className="btn btn-secondary" onClick={() => chrome.runtime.openOptionsPage()}>
          Settings
        </button>
        <button className="btn btn-secondary" onClick={() => chrome.runtime.openOptionsPage()}>
          History
        </button>
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Popup />);
```

---

## 6. ACCEPTANCE TESTS

| # | Test | Expected |
|---|------|----------|
| 1 | Open settings → change font size → close → reopen | New font size persists |
| 2 | Enter Google Cloud key → click Test → wait | Status shows ✓ Valid or ✗ Invalid |
| 3 | Enter invalid key → click Test | Status shows ✗ Invalid with error info |
| 4 | Click "Reset Defaults" → confirm | All settings reset, API keys preserved |
| 5 | Set auto-delete to "1 day" → wait 24h | Old entries automatically removed |
| 6 | Save 501 translations | Oldest entry automatically removed (max 500) |
| 7 | Click "Remove" on API key | Key cleared from storage |
| 8 | Toggle "Auto-save" off → translate image | Translation NOT saved to history |
| 9 | Open settings on second device with same Chrome account | Settings synced via chrome.storage.sync |
| 10 | Click eye icon next to API key | Key revealed in plain text temporarily |

---

## 7. DELIVERABLES

✅ `src/modules/storage.js` — Full storage abstraction
✅ `src/options.jsx` — Complete settings page with 5 tabs
✅ `src/components/settings/*.jsx` — All tab components
✅ `src/background.js` — API key test handlers (all 7 providers)
✅ Updated `src/popup.jsx` — Real state from storage
✅ `manifest.json` — `alarms` permission added
✅ Auto-delete background alarm scheduled
✅ History limit enforcement working

**Next Phase:** Feature 03 — OCR Integration (Google Cloud Vision)
