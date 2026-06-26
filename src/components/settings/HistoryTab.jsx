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
          <span className="stats-label">translations stored ({Math.round((count / 500) * 100)}% of 500 limit)</span>
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
    <button className={`toggle ${value ? 'active' : ''}`} onClick={() => onChange(!value)} aria-pressed={value} type="button">
      <span className="knob" />
    </button>
  );
}
