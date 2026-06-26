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
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
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
