import React from 'react';
import ReactDOM from 'react-dom/client';

export default function Options() {
  const tabs = ['API Keys', 'Translation', 'Appearance', 'History', 'About'];
  const [activeTab, setActiveTab] = React.useState('API Keys');

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
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </aside>
      
      <main className="settings-main">
        <header className="settings-header">
          <h1>Mantra Settings</h1>
        </header>
        
        <section className="tab-content">
          <h2>{activeTab}</h2>
          {activeTab === 'API Keys' && (
            <p>API keys configurations (Google Cloud Vision & Translation providers) coming in Phase 2.</p>
          )}
          {activeTab === 'Translation' && (
            <p>Language targeting and automatic detection settings coming in Phase 2.</p>
          )}
          {activeTab === 'Appearance' && (
            <p>Canvas fonts, sizes, and layout preferences settings coming in Phase 2.</p>
          )}
          {activeTab === 'History' && (
            <p>Saved translations history lists and export functionalities coming in Phase 2.</p>
          )}
          {activeTab === 'About' && (
            <div>
              <p>Mantra Manga Translator Extension - Version 1.0.0</p>
              <p className="muted">Designed for frictionless in-place manga reading translations.</p>
            </div>
          )}
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
