const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

export async function performOcr(imageBlob, apiKey) {
  if (!apiKey) {
    throw new OcrError('NO_API_KEY', 'Google Cloud Vision API key not configured');
  }

  const base64 = await blobToBase64(imageBlob);

  const requestBody = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
        imageContext: { languageHints: ['ja', 'zh', 'ko', 'en'] }
      }
    ]
  };

  const response = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || `HTTP ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      throw new OcrError('AUTH_ERROR', 'Invalid Google Cloud API key. Check settings.', errorBody);
    }
    if (response.status === 429) {
      throw new OcrError('QUOTA_EXCEEDED', 'Google Cloud quota exceeded. Resets monthly.', errorBody);
    }
    if (response.status >= 500) {
      throw new OcrError('SERVER_ERROR', 'Google Cloud server error. Try again shortly.', errorBody);
    }
    throw new OcrError('API_ERROR', message, errorBody);
  }

  const data = await response.json();
  return parseOcrResponse(data);
}

function parseOcrResponse(apiResponse) {
  const response = apiResponse.responses?.[0];
  if (!response || response.error) {
    throw new OcrError('PARSE_ERROR', response?.error?.message || 'Empty OCR response');
  }

  const fullText = response.fullTextAnnotation?.text || '';
  if (!fullText.trim()) {
    return { fullText: '', regions: [], detectedLanguages: [] };
  }

  const regions = [];
  const pages = response.fullTextAnnotation?.pages || [];

  for (const page of pages) {
    for (const block of (page.blocks || [])) {
      const paragraphTexts = [];
      const allVertices = [];
      for (const paragraph of (block.paragraphs || [])) {
        const text = extractTextFromParagraph(paragraph);
        if (text.trim()) {
          paragraphTexts.push(text);
          if (paragraph.boundingBox?.vertices) {
            allVertices.push(...paragraph.boundingBox.vertices);
          }
        }
      }
      if (paragraphTexts.length === 0) continue;
      const combinedText = paragraphTexts.join('\n').trim();
      const bbox = computeAxisAlignedBoundingBox(allVertices);
      regions.push({
        id: crypto.randomUUID(),
        text: combinedText,
        bounds: bbox,
        vertices: block.boundingBox?.vertices || allVertices,
        confidence: block.confidence || 0,
        languages: extractLanguages(block)
      });
    }
  }

  const detectedLanguages = [...new Set(regions.flatMap(r => r.languages))];
  return { fullText, regions, detectedLanguages };
}

function extractTextFromParagraph(paragraph) {
  return (paragraph.words || [])
    .map(word => {
      return (word.symbols || [])
        .map(s => {
          let text = s.text || '';
          const breakType = s.property?.detectedBreak?.type;
          if (breakType === 'SPACE' || breakType === 'SURE_SPACE') text += ' ';
          if (breakType === 'EOL_SURE_SPACE' || breakType === 'LINE_BREAK') text += '\n';
          return text;
        })
        .join('');
    })
    .join('');
}

function extractLanguages(block) {
  const langs = new Set();
  const detected = block.property?.detectedLanguages || [];
  for (const lang of detected) {
    if (lang.languageCode) langs.add(lang.languageCode);
  }
  return Array.from(langs);
}

function computeAxisAlignedBoundingBox(vertices) {
  if (!vertices || vertices.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const xs = vertices.map(v => v.x || 0);
  const ys = vertices.map(v => v.y || 0);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function hashImage(blob) {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export class OcrError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'OcrError';
    this.code = code;
    this.details = details;
  }
}
