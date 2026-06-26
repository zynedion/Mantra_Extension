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

  if (loading) return <div className="history-loading">Loading history...</div>;

  if (entries.length === 0) {
    return (
      <div className="history-empty-state">
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
        <button className="btn btn-secondary" disabled={!hasPrev} onClick={() => loadPage(offset - PAGE_SIZE)}>← Previous</button>
        <span>Page {Math.floor(offset / PAGE_SIZE) + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
        <button className="btn btn-secondary" disabled={!hasNext} onClick={() => loadPage(offset + PAGE_SIZE)}>Next →</button>
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
    if (entry.translatedImageBlob) {
      const url = URL.createObjectURL(entry.translatedImageBlob);
      setThumbUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [entry.id, entry.translatedImageBlob]);

  return (
    <div className="thumbnail-card" onClick={onClick}>
      {thumbUrl ? <img src={thumbUrl} alt="Translation thumbnail" className="thumbnail-img" /> : <div className="thumbnail-placeholder" />}
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
    let oUrl, tUrl;
    if (entry.originalImageBlob) {
      oUrl = URL.createObjectURL(entry.originalImageBlob);
      setOriginalUrl(oUrl);
    }
    if (entry.translatedImageBlob) {
      tUrl = URL.createObjectURL(entry.translatedImageBlob);
      setTranslatedUrl(tUrl);
    }
    return () => {
      if (oUrl) URL.revokeObjectURL(oUrl);
      if (tUrl) URL.revokeObjectURL(tUrl);
    };
  }, [entry.id, entry.originalImageBlob, entry.translatedImageBlob]);

  const handleDownload = (url, suffix) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `mantra-${entry.id.substring(0, 8)}-${suffix}.${suffix === 'original' ? 'jpg' : 'png'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
              {originalUrl ? <img src={originalUrl} alt="Original" /> : <div className="image-placeholder" />}
              <button className="btn btn-secondary" onClick={() => handleDownload(originalUrl, 'original')} disabled={!originalUrl}>Download Original</button>
            </div>
            <div className="image-pane">
              <h3>Translated</h3>
              {translatedUrl ? <img src={translatedUrl} alt="Translated" /> : <div className="image-placeholder" />}
              <button className="btn btn-secondary" onClick={() => handleDownload(translatedUrl, 'translated')} disabled={!translatedUrl}>Download Translated</button>
            </div>
          </div>

          <div className="metadata-block">
            <h3>Metadata</h3>
            <dl className="metadata-list">
              <div className="metadata-row"><dt>Created</dt><dd>{new Date(entry.createdAt).toLocaleString()}</dd></div>
              <div className="metadata-row"><dt>Source</dt><dd>{entry.siteUrl ? <a href={entry.siteUrl} target="_blank" rel="noopener noreferrer">{shortUrl(entry.siteUrl)}</a> : '—'}</dd></div>
              <div className="metadata-row"><dt>Languages</dt><dd>{entry.sourceLang} → {entry.targetLang}</dd></div>
              <div className="metadata-row"><dt>Model</dt><dd>{entry.translationModel}</dd></div>
              <div className="metadata-row"><dt>Regions</dt><dd>{entry.regions?.length || 0}</dd></div>
            </dl>
          </div>

          {entry.regions && entry.regions.length > 0 && (
            <div className="regions-block">
              <h3>Translations</h3>
              <table className="regions-table">
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
  if (diff < 0 || minutes < 1) return 'just now';
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
