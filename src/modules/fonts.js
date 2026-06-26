/**
 * Manga font registry mapping internal names to Google Fonts.
 */
export const FONTS = {
  WildWords: {
    googleFamily: 'Fredoka One',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap',
    fallback: 'sans-serif',
    cssName: '"Fredoka One", sans-serif'
  },
  Heroika: {
    googleFamily: 'Fredoka',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&display=swap',
    fallback: 'sans-serif',
    cssName: '"Fredoka", sans-serif'
  },
  Shonen: {
    googleFamily: 'Fredoka Mono',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Fredoka+Mono:wght@500;700&display=swap',
    fallback: 'monospace',
    cssName: '"Fredoka Mono", monospace'
  },
  KomikaJam: {
    googleFamily: 'Comfortaa',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@600;700&display=swap',
    fallback: 'cursive',
    cssName: '"Comfortaa", cursive'
  },
  Bangers: {
    googleFamily: 'Bangers',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Bangers&display=swap',
    fallback: 'cursive',
    cssName: '"Bangers", cursive'
  }
};

const loadedFonts = new Set();

/**
 * Preload a Google Font in document head and wait for it to be ready.
 * Must be called in DOM contexts (content script, popup, options).
 */
export async function loadFont(fontKey) {
  if (loadedFonts.has(fontKey)) return;
  const font = FONTS[fontKey];
  if (!font) throw new Error(`Unknown font: ${fontKey}`);

  if (typeof document !== 'undefined') {
    // Inject <link> if not already present
    const existing = document.querySelector(`link[data-mantra-font="${fontKey}"]`);
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = font.googleUrl;
      link.dataset.mantraFont = fontKey;
      document.head.appendChild(link);
    }

    // Wait for font to be ready
    if (document.fonts && document.fonts.load) {
      try {
        await document.fonts.load(`16px "${font.googleFamily}"`);
      } catch (err) {
        console.warn(`[Mantra] Font load timeout for ${fontKey}, continuing with fallback`);
      }
    }
  }

  loadedFonts.add(fontKey);
}

/**
 * Preload all manga fonts at startup (background prefetch).
 */
export async function preloadAllFonts() {
  await Promise.all(Object.keys(FONTS).map(k => loadFont(k).catch(() => {})));
}

/**
 * Helper for resetting internal state during testing.
 */
export function _resetLoadedFonts() {
  loadedFonts.clear();
}
