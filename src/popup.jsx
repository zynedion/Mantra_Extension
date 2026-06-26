import React from 'react';
import ReactDOM from 'react-dom/client';

export default function Popup() {
  const [enabled, setEnabled] = React.useState(true);
  
  React.useEffect(() => {
    chrome.storage.sync.get('settings', (result) => {
      if (result && result.settings) {
        setEnabled(result.settings.enabledOnAllPages ?? true);
      }
    });
  }, []);
  
  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    
    chrome.storage.sync.get('settings', (result) => {
      const currentSettings = result.settings || {};
      currentSettings.enabledOnAllPages = newState;
      chrome.storage.sync.set({ settings: currentSettings });
    });
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleExtension',
          enabled: newState
        });
      }
    });
  };
  
  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };
  
  return (
    <div className="popup">
      <div className="popup-header">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M6 8L12 4L18 8V16L12 20L6 16V8Z" fill="#4F63A8"/>
          <path d="M16 12L18 14L16 16L14 14L16 12Z" fill="#4F63A8"/>
        </svg>
        <h1>Mantra</h1>
      </div>
      
      <div className="popup-content">
        <div className="setting-row">
          <span>Enable on this page</span>
          <button 
            className={`toggle ${enabled ? 'active' : ''}`}
            onClick={handleToggle}
            aria-label="Toggle Extension"
          >
            <span className="knob"></span>
          </button>
        </div>
        
        <div className="recent-translations">
          <h2>Recent Translations</h2>
          <p className="muted">No translations yet</p>
        </div>
      </div>
      
      <div className="popup-footer">
        <button className="btn btn-secondary" onClick={openSettings}>
          Settings
        </button>
        <button className="btn btn-secondary">
          History
        </button>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<Popup />);
}
