import { FONTS, loadFont } from '../fonts.js';
import { fitTextInBounds } from './text-fitter.js';

const bitmapCache = new WeakMap();

async function getOrCreateBitmap(blob) {
  if (bitmapCache.has(blob)) return bitmapCache.get(blob);
  const bitmap = await createImageBitmap(blob);
  bitmapCache.set(blob, bitmap);
  return bitmap;
}

/**
 * Render translated text onto original image, returning a new Blob.
 *
 * @param {Blob} originalImageBlob
 * @param {Array} regions - [{ id, text, translatedText, bounds, vertices }]
 * @param {Object} settings - from SettingsStore
 * @returns {Promise<Blob>} PNG blob of translated image
 */
export async function renderTranslatedImage(originalImageBlob, regions, settings) {
  // Load font
  await loadFont(settings.fontFamily);
  const fontFamilyCss = FONTS[settings.fontFamily]?.cssName || 'sans-serif';

  // Load original image
  const imgBitmap = await getOrCreateBitmap(originalImageBlob);

  // Create canvas at native resolution
  const canvas = new OffscreenCanvas(imgBitmap.width, imgBitmap.height);
  const ctx = canvas.getContext('2d');

  // Draw original
  ctx.drawImage(imgBitmap, 0, 0);

  // Render each region
  for (const region of regions) {
    if (!region.translatedText?.trim()) continue;
    drawRegion(ctx, region, settings, fontFamilyCss);
  }

  // Convert to PNG blob
  return await canvas.convertToBlob({ type: 'image/png' });
}

/**
 * Draw a single translated region onto the canvas.
 * Steps:
 *   1. Cover original text with bubble fill (white polygon or rounded rect)
 *   2. Fit translated text into bounds
 *   3. Draw stroke + fill text
 */
function drawRegion(ctx, region, settings, fontFamilyCss) {
  const { bounds, vertices, translatedText } = region;

  // Step 1: Cover original text with background
  drawBackground(ctx, bounds, vertices, settings);

  // Step 2: Compute fit
  const padding = settings.borderPadding || 4;
  const fit = fitTextInBounds(translatedText, bounds, fontFamilyCss, {
    minFontSize: 6,
    maxFontSize: settings.fontSize * 2, // Use settings.fontSize as preferred, allow larger
    lineSpacingPercent: settings.lineSpacing || 100,
    padding
  });

  // Step 3: Draw text
  drawText(ctx, fit, bounds, settings, fontFamilyCss);
}

function drawBackground(ctx, bounds, vertices, settings) {
  ctx.save();

  // For manga, default to white background cover
  ctx.fillStyle = '#ffffff';

  if (vertices && vertices.length >= 4) {
    // Use polygon path for accurate bubble shape with slight expansion
    const expanded = expandPolygon(vertices, 3); // 3px outward expand
    ctx.beginPath();
    ctx.moveTo(expanded[0].x, expanded[0].y);
    for (let i = 1; i < expanded.length; i++) {
      ctx.lineTo(expanded[i].x, expanded[i].y);
    }
    ctx.closePath();
    ctx.fill();
  } else if (bounds) {
    // Rounded rect fallback
    const radius = settings.borderRadius || 8;
    drawRoundedRect(ctx, bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4, radius);
    ctx.fill();
  }

  ctx.restore();
}

function drawText(ctx, fit, bounds, settings, fontFamilyCss) {
  const { fontSize, lines, lineHeight } = fit;

  ctx.save();
  ctx.font = `${fontSize}px ${fontFamilyCss}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = settings.textAlignment === 'left' ? 'left'
                : settings.textAlignment === 'right' ? 'right'
                : 'center';

  // Letter spacing (modern canvas API)
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${settings.letterSpacing || 0}px`;
  }

  // Compute starting x based on alignment
  const padding = settings.borderPadding || 4;
  let x;
  if (ctx.textAlign === 'left') x = bounds.x + padding;
  else if (ctx.textAlign === 'right') x = bounds.x + bounds.width - padding;
  else x = bounds.x + bounds.width / 2;

  // Vertically center the block
  const totalHeight = lines.length * lineHeight;
  const startY = bounds.y + (bounds.height - totalHeight) / 2 + lineHeight / 2;

  // Draw each line
  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineHeight;

    // Stroke first (outline behind text)
    if (settings.strokeSize > 0) {
      ctx.strokeStyle = settings.strokeColor || '#ffffff';
      ctx.lineWidth = settings.strokeSize;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(lines[i], x, y);
    }

    // Fill on top
    ctx.fillStyle = settings.fontColor || '#000000';
    ctx.fillText(lines[i], x, y);
  }

  ctx.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function expandPolygon(vertices, amount) {
  // Compute centroid
  const cx = vertices.reduce((s, v) => s + v.x, 0) / vertices.length;
  const cy = vertices.reduce((s, v) => s + v.y, 0) / vertices.length;

  // Push each vertex away from centroid by `amount`
  return vertices.map(v => {
    const dx = v.x - cx;
    const dy = v.y - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return v;
    return {
      x: v.x + (dx / len) * amount,
      y: v.y + (dy / len) * amount
    };
  });
}
