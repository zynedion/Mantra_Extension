import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { SettingsStore, DEFAULT_SETTINGS } from './modules/storage.js';
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

export default function Options() {
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
    return <div className="loading-screen" style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading...</div>;
  }

  return (
    <div className="settings-container">
      <aside className="tab-nav">
        <div className="sidebar-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
            <path d="M6 8L12 4L18 8V16L12 20L6 16V8Z" fill="#4F63A8"/>
            <path d="M16 12L18 14L16 16L14 14L16 12Z" fill="#4F63A8"/>
          </svg>
          <h2>Mantra</h2>
        </div>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </aside>

      <main className="settings-main">
        <header className="settings-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Mantra Settings</h1>
          <button className="btn btn-secondary" onClick={handleReset} type="button">
            Reset Defaults
          </button>
        </header>

        <section className="tab-content">
          {activeTab === 'api' && <ApiKeysTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'translation' && <TranslationTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'appearance' && <AppearanceTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'history' && <HistoryTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'about' && <AboutTab />}
        </section>
      </main>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<Options />);
}
