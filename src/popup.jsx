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
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleExtension', enabled: newState });
      }
    });
  };

  return (
    <div className="popup">
      <header className="popup-header">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
          <path d="M6 8L12 4L18 8V16L12 20L6 16V8Z" fill="#4F63A8"/>
          <path d="M16 12L18 14L16 16L14 14L16 12Z" fill="#4F63A8"/>
        </svg>
        <h1>Mantra</h1>
      </header>

      <div className="popup-content">
        <div className="setting-row">
          <label>Enable on this page</label>
          <button className={`toggle ${enabled ? 'active' : ''}`} onClick={handleToggle} type="button">
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
        <button className="btn btn-secondary" onClick={() => chrome.runtime.openOptionsPage()} type="button">
          Settings
        </button>
        <button className="btn btn-secondary" onClick={() => chrome.runtime.openOptionsPage()} type="button">
          History
        </button>
      </footer>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<Popup />);
}
