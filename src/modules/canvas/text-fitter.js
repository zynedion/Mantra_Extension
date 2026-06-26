/**
 * Binary search for the largest font size that allows the text to fit
 * within the given bounds (width × height), with multi-line wrapping.
 */

const MIN_FONT_SIZE = 6;
const ABSOLUTE_MAX_FONT_SIZE = 96;

export function fitTextInBounds(text, bounds, fontFamilyCss, options = {}) {
  const {
    maxFontSize = ABSOLUTE_MAX_FONT_SIZE,
    minFontSize = MIN_FONT_SIZE,
    lineSpacingPercent = 100,
    padding = 4
  } = options;

  const innerWidth = bounds.width - padding * 2;
  const innerHeight = bounds.height - padding * 2;

  if (innerWidth <= 0 || innerHeight <= 0) {
    return { fontSize: minFontSize, lines: [text], lineHeight: minFontSize * (lineSpacingPercent / 100), fits: false, totalHeight: 0, widestLine: 0 };
  }

  // Try sizes from high to low using binary search
  let lo = minFontSize;
  let hi = Math.min(maxFontSize, innerHeight); // No point trying font larger than bubble height
  if (hi < lo) hi = lo;
  let bestFit = null;

  // Coarse search first
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const result = tryFitAtSize(text, mid, innerWidth, innerHeight, fontFamilyCss, lineSpacingPercent);
    if (result.fits) {
      bestFit = { fontSize: mid, ...result };
      lo = mid + 1; // Try larger
    } else {
      hi = mid - 1; // Try smaller
    }
  }

  if (!bestFit) {
    // Couldn't fit even at minimum — render at min with overflow allowed
    const fallback = tryFitAtSize(text, minFontSize, innerWidth, innerHeight, fontFamilyCss, lineSpacingPercent);
    bestFit = { fontSize: minFontSize, ...fallback };
  }

  return bestFit;
}

function tryFitAtSize(text, fontSize, maxWidth, maxHeight, fontFamilyCss, lineSpacingPercent) {
  const lineHeight = fontSize * (lineSpacingPercent / 100);
  const lines = wrapText(text, fontSize, fontFamilyCss, maxWidth);

  const totalHeight = lines.length * lineHeight;
  const widestLine = lines.length > 0
    ? Math.max(...lines.map(l => measureText(l, fontSize, fontFamilyCss)))
    : 0;

  const fits = widestLine <= maxWidth && totalHeight <= maxHeight;

  return { lines, lineHeight, fits, totalHeight, widestLine };
}

let measureCanvas = null;
let measureCtx = null;

function getMeasureContext() {
  if (!measureCtx) {
    if (typeof OffscreenCanvas !== 'undefined') {
      try {
        measureCanvas = new OffscreenCanvas(1, 1);
        measureCtx = measureCanvas.getContext('2d');
      } catch (e) {
        measureCanvas = null;
        measureCtx = null;
      }
    }
    if (!measureCtx && typeof document !== 'undefined') {
      measureCanvas = document.createElement('canvas');
      measureCtx = measureCanvas.getContext('2d');
    }
  }
  return measureCtx;
}

function measureText(text, fontSize, fontFamilyCss) {
  const ctx = getMeasureContext();
  if (!ctx) {
    // Fallback if no canvas support (e.g. Node without DOM)
    return text.length * fontSize * 0.6;
  }
  ctx.font = `${fontSize}px ${fontFamilyCss}`;
  return ctx.measureText(text).width;
}

/**
 * Wrap text into multiple lines that fit `maxWidth`. Handles both
 * space-separated languages (Latin, Indonesian) and CJK (Japanese/Chinese)
 * where you can break between any character.
 */
function wrapText(text, fontSize, fontFamilyCss, maxWidth) {
  // First respect explicit \n
  const paragraphs = text.split('\n').map(p => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return [text];

  const allLines = [];
  for (const para of paragraphs) {
    if (containsCJK(para) && !para.includes(' ')) {
      // CJK without spaces — break character by character
      allLines.push(...wrapByCharacter(para, fontSize, fontFamilyCss, maxWidth));
    } else {
      // Space-delimited — break word by word
      allLines.push(...wrapByWord(para, fontSize, fontFamilyCss, maxWidth));
    }
  }
  return allLines;
}

function wrapByWord(text, fontSize, fontFamilyCss, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureText(candidate, fontSize, fontFamilyCss) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // Check if single word is wider than maxWidth — break by character
      if (measureText(word, fontSize, fontFamilyCss) > maxWidth) {
        const chunks = wrapByCharacter(word, fontSize, fontFamilyCss, maxWidth);
        if (chunks.length > 0) {
          lines.push(...chunks.slice(0, -1));
          current = chunks[chunks.length - 1] || '';
        } else {
          current = '';
        }
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

function wrapByCharacter(text, fontSize, fontFamilyCss, maxWidth) {
  const lines = [];
  let current = '';
  for (const ch of text) {
    const candidate = current + ch;
    if (measureText(candidate, fontSize, fontFamilyCss) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = ch;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function containsCJK(text) {
  return /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/.test(text);
}
