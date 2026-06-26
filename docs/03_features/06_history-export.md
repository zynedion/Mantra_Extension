# Feature 06: History Management & ZIP Export
## Phase 6 — Personal Archive

**Objective:** Save every translation (when enabled), provide a browsable history gallery, and let the user export all translations as a structured ZIP file containing originals, translated images, and metadata.

**Timeline:** 2-3 days
**Dependencies:** Phase 5 complete (canvas rendering produces translated blobs)

**Acceptance Criteria:**
- ✅ Auto-save triggers after every successful translation (when toggle ON)
- ✅ History gallery shows thumbnails sorted by newest first
- ✅ User can click thumbnail → view full original + translated side-by-side
- ✅ User can delete individual entries or clear all
- ✅ ZIP export downloads `mantra-history-YYYY-MM-DD.zip` with structured contents
- ✅ Auto-delete runs daily via chrome.alarms
- ✅ 500-entry max enforced; oldest evicted automatically

---

## 1. HISTORY SAVE FLOW

```
Canvas rendering completes (Phase 5)
  ↓
content-script.js sends 'saveToHistory' message
  ↓
background.js:
  1. Reconstruct blobs from transferred array data
  2. Build entry with metadata
  3. Call HistoryStore.save (Phase 2)
  4. Enforce 500-entry limit
  ↓
Send response: { success, id }
```

---

## 2. BACKGROUND HANDLER

### **Add to `src/background.js`:**

```javascript
import { HistoryStore, SettingsStore } from './modules/storage.js';

if (request.action === 'saveToHistory') {
  handleHistorySave(request).then(sendResponse);
  return true;
}

if (request.action === 'exportHistoryAsZip') {
  handleHistoryExport().then(sendResponse);
  return true;
}

async function handleHistorySave(request) {
  try {
    const settings = await SettingsStore.getAll();
    if (!settings.autoSave) {
      return { success: false, skipped: true, reason: 'Auto-save disabled' };
    }

    const entry = request.entry;
    const originalBlob = new Blob(
      [new Uint8Array(entry.originalImageData)],
      { type: 'image/jpeg' }
    );
    const translatedBlob = new Blob(
      [new Uint8Array(entry.translatedImageData)],
      { type: 'image/png' }
    );

    // Concatenate all OCR + translation text for searchability
    const originalText = entry.regions.map(r => r.text).filter(Boolean).join('\n---\n');
    const translatedText = entry.regions.map(r => r.translatedText).filter(Boolean).join('\n---\n');

    const id = await HistoryStore.save({
      originalImageBlob: originalBlob,
      translatedImageBlob: translatedBlob,
      originalText,
      translatedText,
      siteUrl: entry.siteUrl,
      sourceLang: entry.sourceLang,
      targetLang: entry.targetLang,
      translationModel: entry.translationModel,
      canvasSettings: entry.canvasSettings,
      regions: entry.regions
    });

    return { success: true, id };
  } catch (error) {
    console.error('[Mantra] Save to history failed:', error);
    return { success: false, error: error.message };
  }
}
```

---

## 3. ZIP EXPORT

### **File: `src/modules/zip-export.js`**

```javascript
/**
 * Build a ZIP file from translation history.
 * Uses fflate (small, fast, MIT-licensed) instead of JSZip (heavier).
 */

import { zipSync, strToU8 } from 'fflate';
import { HistoryStore } from './storage.js';

/**
 * Build ZIP structure:
 *
 *   mantra-history-2026-06-26/
 *     ├── README.md
 *     ├── manifest.json          (index of all entries)
 *     ├── translations/
 *     │   ├── 2026-06-26_103015_<short-id>/
 *     │   │   ├── original.jpg
 *     │   │   ├── translated.png
 *     │   │   └── metadata.json
 *     │   ├── 2026-06-25_154220_<short-id>/
 *     │   │   ...
 */
export async function buildHistoryZip() {
  const entries = await HistoryStore.getAll();
  if (entries.length === 0) {
    throw new Error('No history to export');
  }

  const zipObj = {};
  const indexEntries = [];

  for (const entry of entries) {
    const folderName = formatFolderName(entry);
    const shortId = entry.id.substring(0, 8);

    // Original image
    const originalBytes = new Uint8Array(await entry.originalImageBlob.arrayBuffer());
    zipObj[`translations/${folderName}/original.jpg`] = originalBytes;

    // Translated image
    const translatedBytes = new Uint8Array(await entry.translatedImageBlob.arrayBuffer());
    zipObj[`translations/${folderName}/translated.png`] = translatedBytes;

    // Per-entry metadata
    const metadata = {
      id: entry.id,
      createdAt: entry.createdAt,
      siteUrl: entry.siteUrl,
      sourceLang: entry.sourceLang,
      targetLang: entry.targetLang,
      translationModel: entry.translationModel,
      canvasSettings: entry.canvasSettings,
      regions: (entry.regions || []).map(r => ({
        id: r.id,
        text: r.text,
        translatedText: r.translatedText,
        bounds: r.bounds,
        sourceLang: r.sourceLang
      })),
      originalText: entry.originalText,
      translatedText: entry.translatedText
    };
    zipObj[`translations/${folderName}/metadata.json`] = strToU8(JSON.stringify(metadata, null, 2));

    // Index entry for manifest
    indexEntries.push({
      id: entry.id,
      shortId,
      folder: folderName,
      createdAt: entry.createdAt,
      siteUrl: entry.siteUrl,
      sourceLang: entry.sourceLang,
      targetLang: entry.targetLang,
      regionCount: entry.regions?.length || 0
    });
  }

  // Top-level manifest
  const manifest = {
    exportVersion: 1,
    generatedAt: new Date().toISOString(),
    generator: 'Mantra Extension v1.0.0',
    totalEntries: entries.length,
    entries: indexEntries
  };
  zipObj['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));

  // README
  zipObj['README.md'] = strToU8(buildReadme(manifest));

  // Compress
  const zipBytes = zipSync(zipObj, { level: 6 });
  return new Blob([zipBytes], { type: 'application/zip' });
}

function formatFolderName(entry) {
  const date = new Date(entry.createdAt);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const shortId = entry.id.substring(0, 8);
  return `${yyyy}-${mm}-${dd}_${hh}${min}${ss}_${shortId}`;
}

function buildReadme(manifest) {
  return `# Mantra Translation History

**Exported:** ${manifest.generatedAt}
**Generator:** ${manifest.generator}
**Total Translations:** ${manifest.totalEntries}

## Structure

\`\`\`
mantra-history-<date>/
├── README.md                    ← This file
├── manifest.json                ← Index of all translations
└── translations/
    └── YYYY-MM-DD_HHMMSS_<id>/
        ├── original.jpg         ← Original manga page
        ├── translated.png       ← Translated overlay
        └── metadata.json        ← OCR text, translations, settings
\`\`\`

## Reading metadata.json

Each \`metadata.json\` contains:
- \`regions\`: Array of detected text regions with bounds and translations
- \`originalText\`: All original text joined with separators
- \`translatedText\`: All translated text joined with separators
- \`canvasSettings\`: Render settings used (font, colors, etc.)
- \`siteUrl\`: Page where the translation was created

You can re-import this data into any tool that handles JSON.

## Privacy Note

This archive contains images you translated and the URLs of pages you visited.
Keep it in a private location.
`;
}
```

### **Background handler:**

```javascript
import { buildHistoryZip } from './modules/zip-export.js';

async function handleHistoryExport() {
  try {
    const zipBlob = await buildHistoryZip();
    const arrayBuffer = await zipBlob.arrayBuffer();

    // Trigger download via downloads API
    const dataUrl = await blobToDataUrl(zipBlob);
    const filename = `mantra-history-${formatDate(new Date())}.zip`;

    await chrome.downloads.download({
      url: dataUrl,
      filename,
      saveAs: false // Saves to default Downloads folder
    });

    return { success: true, filename };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}
```

### **Add to `manifest.json` permissions:**

```json
"permissions": ["storage", "tabs", "activeTab", "scripting", "alarms", "downloads"]
```

### **Add to `package.json` dependencies:**

```json
"fflate": "^0.8.2"
```

---

## 4. HISTORY GALLERY UI

The history gallery lives inside the Settings page's History tab (already partially built in Phase 2). Enhance it with a full gallery view.

### **File: `src/components/settings/HistoryGallery.jsx`**

```jsx
import React, { useEffect, useState } from 'react';
import { HistoryStore } from '../../modules/storage.js';

const PAGE_SIZE = 12;

export default function HistoryGallery() {
  const [entries, setEntries] = useState([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPage(0);
  }, []);

  async function loadPage(newOffset) {
    setLoading(true);
    const [items, count] = await Promise.all([
      HistoryStore.getRecent(PAGE_SIZE, newOffset),
      HistoryStore.count()
    ]);
    setEntries(items);
    setOffset(newOffset);
    setTotal(count);
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this translation? This cannot be undone.')) return;
    await HistoryStore.delete(id);
    setSelected(null);
    loadPage(offset);
  }

  if (loading) return <div className="loading">Loading history...</div>;

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <p>No translations yet.</p>
        <p className="hint">Translations will appear here when auto-save is enabled.</p>
      </div>
    );
  }

  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  return (
    <div className="history-gallery">
      <div className="gallery-toolbar">
        <span>{total} translation{total !== 1 ? 's' : ''} total</span>
      </div>

      <div className="gallery-grid">
        {entries.map(entry => (
          <ThumbnailCard
            key={entry.id}
            entry={entry}
            onClick={() => setSelected(entry)}
            onDelete={() => handleDelete(entry.id)}
          />
        ))}
      </div>

      <div className="gallery-pagination">
        <button disabled={!hasPrev} onClick={() => loadPage(offset - PAGE_SIZE)}>← Previous</button>
        <span>Page {Math.floor(offset / PAGE_SIZE) + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
        <button disabled={!hasNext} onClick={() => loadPage(offset + PAGE_SIZE)}>Next →</button>
      </div>

      {selected && (
        <DetailModal entry={selected} onClose={() => setSelected(null)} onDelete={() => handleDelete(selected.id)} />
      )}
    </div>
  );
}

function ThumbnailCard({ entry, onClick, onDelete }) {
  const [thumbUrl, setThumbUrl] = useState(null);

  useEffect(() => {
    const url = URL.createObjectURL(entry.translatedImageBlob);
    setThumbUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [entry.id]);

  return (
    <div className="thumbnail-card" onClick={onClick}>
      {thumbUrl && <img src={thumbUrl} alt="" />}
      <div className="thumbnail-overlay">
        <span className="thumbnail-date">{formatRelativeDate(entry.createdAt)}</span>
        <button className="btn-icon-danger" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">
          🗑
        </button>
      </div>
    </div>
  );
}

function DetailModal({ entry, onClose, onDelete }) {
  const [originalUrl, setOriginalUrl] = useState(null);
  const [translatedUrl, setTranslatedUrl] = useState(null);

  useEffect(() => {
    const oUrl = URL.createObjectURL(entry.originalImageBlob);
    const tUrl = URL.createObjectURL(entry.translatedImageBlob);
    setOriginalUrl(oUrl);
    setTranslatedUrl(tUrl);
    return () => {
      URL.revokeObjectURL(oUrl);
      URL.revokeObjectURL(tUrl);
    };
  }, [entry.id]);

  const handleDownload = (url, suffix) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `mantra-${entry.id.substring(0, 8)}-${suffix}.${suffix === 'original' ? 'jpg' : 'png'}`;
    a.click();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Translation Details</h2>
          <button onClick={onClose} className="btn-close">×</button>
        </header>

        <div className="modal-body">
          <div className="image-comparison">
            <div className="image-pane">
              <h3>Original</h3>
              {originalUrl && <img src={originalUrl} alt="Original" />}
              <button onClick={() => handleDownload(originalUrl, 'original')}>Download Original</button>
            </div>
            <div className="image-pane">
              <h3>Translated</h3>
              {translatedUrl && <img src={translatedUrl} alt="Translated" />}
              <button onClick={() => handleDownload(translatedUrl, 'translated')}>Download Translated</button>
            </div>
          </div>

          <div className="metadata-block">
            <h3>Metadata</h3>
            <dl>
              <dt>Created</dt>
              <dd>{new Date(entry.createdAt).toLocaleString()}</dd>
              <dt>Source</dt>
              <dd>{entry.siteUrl ? <a href={entry.siteUrl} target="_blank" rel="noopener noreferrer">{shortUrl(entry.siteUrl)}</a> : '—'}</dd>
              <dt>Languages</dt>
              <dd>{entry.sourceLang} → {entry.targetLang}</dd>
              <dt>Model</dt>
              <dd>{entry.translationModel}</dd>
              <dt>Regions</dt>
              <dd>{entry.regions?.length || 0}</dd>
            </dl>
          </div>

          {entry.regions && (
            <div className="regions-block">
              <h3>Translations</h3>
              <table>
                <thead>
                  <tr><th>#</th><th>Original</th><th>Translated</th></tr>
                </thead>
                <tbody>
                  {entry.regions.map((r, i) => (
                    <tr key={r.id || i}>
                      <td>{i + 1}</td>
                      <td>{r.text}</td>
                      <td>{r.translatedText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button className="btn btn-danger" onClick={onDelete}>Delete</button>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  );
}

function formatRelativeDate(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function shortUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
```

### **Update `HistoryTab.jsx` to embed the gallery:**

```jsx
import HistoryGallery from './HistoryGallery.jsx';

// Inside HistoryTab, add at bottom:
<section className="setting-group">
  <h3>Browse History</h3>
  <HistoryGallery />
</section>
```

---

## 5. POPUP RECENT TRANSLATIONS

Already wired in Phase 2's popup update. Verify behavior:
- Shows 3 most recent thumbnails
- Click thumbnail → opens settings page on History tab with detail modal open

### **Optional: Add deep-link from popup**

```javascript
// In popup.jsx
const handleThumbnailClick = (entry) => {
  chrome.runtime.openOptionsPage();
  // Could pass entry.id via storage flag for opening detail directly:
  chrome.storage.local.set({ openHistoryDetail: entry.id });
};

// In options.jsx, on mount:
useEffect(() => {
  chrome.storage.local.get('openHistoryDetail', ({ openHistoryDetail }) => {
    if (openHistoryDetail) {
      setActiveTab('history');
      // Pass to HistoryGallery via prop or context
      chrome.storage.local.remove('openHistoryDetail');
    }
  });
}, []);
```

---

## 6. AUTO-DELETE SCHEDULING

Already wired in Phase 2 via `chrome.alarms`. Verify daily check is working:

```javascript
// In background.js (already added in Phase 2):
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'mantra-auto-delete') {
    const deletedCount = await HistoryStore.runAutoDelete();
    if (deletedCount > 0) {
      console.log(`[Mantra] Auto-deleted ${deletedCount} entries`);
    }
  }
});
```

Verify the alarm is registered on install:

```javascript
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('mantra-auto-delete', { periodInMinutes: 60 * 24 });
});
```

---

## 7. ACCEPTANCE TESTS

| # | Test | Expected |
|---|------|----------|
| 1 | Translate image with autoSave ON | Entry appears in history gallery within seconds |
| 2 | Translate with autoSave OFF | Nothing added to history |
| 3 | Open history tab, click thumbnail | Detail modal shows original + translated side-by-side |
| 4 | Click "Delete" on detail modal | Entry removed, gallery refreshes |
| 5 | Click "Download Original" in detail modal | JPG downloads |
| 6 | Click "Download Translated" in detail modal | PNG downloads |
| 7 | Click "Export All as ZIP" | ZIP downloads to Downloads folder |
| 8 | Open ZIP, inspect structure | README, manifest.json, translations/ folder all present |
| 9 | Set auto-delete to "1 day", wait 24h | Old entries removed automatically |
| 10 | Save 501 translations | Oldest entry evicted, count stays at 500 |
| 11 | Pagination: navigate to page 2 | Correct entries shown |
| 12 | Filter (future): search by site URL | (deferred to v2) |

---

## 8. ZIP STRUCTURE EXAMPLE

```
mantra-history-2026-06-26.zip
├── README.md
├── manifest.json
└── translations/
    ├── 2026-06-26_094839_a1b2c3d4/
    │   ├── original.jpg
    │   ├── translated.png
    │   └── metadata.json
    ├── 2026-06-25_154220_b5c6d7e8/
    │   ├── original.jpg
    │   ├── translated.png
    │   └── metadata.json
    └── 2026-06-24_120145_c9d0e1f2/
        ├── original.jpg
        ├── translated.png
        └── metadata.json
```

**Example `metadata.json`:**
```json
{
  "id": "a1b2c3d4-...",
  "createdAt": "2026-06-26T09:48:39.000Z",
  "siteUrl": "https://mangadex.org/chapter/...",
  "sourceLang": "ja",
  "targetLang": "id",
  "translationModel": "langbly",
  "canvasSettings": {
    "fontSize": 16,
    "fontFamily": "WildWords",
    "fontColor": "#000000",
    "strokeColor": "#ffffff",
    "strokeSize": 2,
    "textAlignment": "center"
  },
  "regions": [
    {
      "id": "r1",
      "text": "こんにちは",
      "translatedText": "Halo",
      "bounds": { "x": 120, "y": 80, "width": 200, "height": 60 },
      "sourceLang": "ja"
    }
  ],
  "originalText": "こんにちは\n---\n元気ですか",
  "translatedText": "Halo\n---\nApa kabar"
}
```

---

## 9. DELIVERABLES

✅ Background save handler with blob reconstruction
✅ `src/modules/zip-export.js` — fflate-based ZIP builder with structured folders
✅ `src/components/settings/HistoryGallery.jsx` — Paginated thumbnail gallery
✅ Detail modal with side-by-side comparison, per-region table, individual downloads
✅ ZIP export wired to `chrome.downloads` API
✅ `downloads` permission added to manifest
✅ `fflate` added to dependencies
✅ Auto-delete confirmed working via daily alarm
✅ 500-entry limit enforced automatically

**Next Phase:** Feature 07 — Polish, Performance, Testing, Release
