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
    setRevealedKeys(prev => ({ ...prev, [providerId]: !revealedKeys[providerId] }));
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
          value={settings.translationProvider || 'langbly'}
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
