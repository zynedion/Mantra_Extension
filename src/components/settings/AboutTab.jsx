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
