import { openDB } from 'idb';

const DB_NAME = 'MantraDB';
const DB_VERSION = 1;
const STORE_TRANSLATIONS = 'translations';

export const DEFAULT_SETTINGS = {
  enabledOnAllPages: true,
  iconOpacity: 0.3,
  targetLanguage: 'id',
  autoDetectLanguage: true,
  sourceLanguageFallback: 'ja',
  fontSize: 16,
  fontFamily: 'WildWords',
  fontColor: '#000000',
  strokeColor: '#ffffff',
  strokeSize: 2,
  textAlignment: 'center',
  lineSpacing: 100,
  letterSpacing: 0,
  borderRadius: 8,
  borderPadding: 4,
  autoSave: true,
  autoDeleteAge: 'never',
  maxHistoryEntries: 500,
  theme: 'dark',
  translationProvider: 'langbly',
};

export const SUPPORTED_PROVIDERS = [
  'googleCloud', 'langbly', 'openrouter', 'gemini', 'openai', 'claude', 'deepseek'
];

export const SettingsStore = {
  async getAll() {
    const result = await chrome.storage.sync.get('settings');
    return { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
  },
  async get(key) {
    const all = await this.getAll();
    return all[key];
  },
  async set(key, value) {
    const all = await this.getAll();
    all[key] = value;
    await chrome.storage.sync.set({ settings: all });
    return value;
  },
  async setMany(partial) {
    const all = await this.getAll();
    const updated = { ...all, ...partial };
    await chrome.storage.sync.set({ settings: updated });
    return updated;
  },
  async reset() {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
    return DEFAULT_SETTINGS;
  }
};

export const ApiKeyStore = {
  async get(provider) {
    if (!SUPPORTED_PROVIDERS.includes(provider)) throw new Error(`Unsupported provider: ${provider}`);
    const { apiKeys } = await chrome.storage.sync.get('apiKeys');
    return apiKeys?.[provider]?.key || null;
  },
  async getMetadata(provider) {
    const { apiKeys } = await chrome.storage.sync.get('apiKeys');
    return apiKeys?.[provider] || null;
  },
  async set(provider, key) {
    if (!SUPPORTED_PROVIDERS.includes(provider)) throw new Error(`Unsupported provider: ${provider}`);
    const { apiKeys = {} } = await chrome.storage.sync.get('apiKeys');
    apiKeys[provider] = {
      key,
      lastTested: null,
      isValid: null,
      savedAt: new Date().toISOString()
    };
    await chrome.storage.sync.set({ apiKeys });
  },
  async markTested(provider, isValid) {
    const { apiKeys = {} } = await chrome.storage.sync.get('apiKeys');
    if (apiKeys[provider]) {
      apiKeys[provider].lastTested = new Date().toISOString();
      apiKeys[provider].isValid = isValid;
      await chrome.storage.sync.set({ apiKeys });
    }
  },
  async remove(provider) {
    const { apiKeys = {} } = await chrome.storage.sync.get('apiKeys');
    delete apiKeys[provider];
    await chrome.storage.sync.set({ apiKeys });
  },
  async listConfigured() {
    const { apiKeys = {} } = await chrome.storage.sync.get('apiKeys');
    return Object.keys(apiKeys).filter(p => apiKeys[p]?.key);
  }
};

let dbInstance = null;
async function getDB() {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_TRANSLATIONS)) {
        const store = db.createObjectStore(STORE_TRANSLATIONS, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('siteUrl', 'siteUrl');
      }
    }
  });
  return dbInstance;
}

export const HistoryStore = {
  async save(entry) {
    const db = await getDB();
    const record = {
      id: entry.id || crypto.randomUUID(),
      originalImageBlob: entry.originalImageBlob || new Blob(),
      translatedImageBlob: entry.translatedImageBlob || new Blob(),
      originalText: entry.originalText || '',
      translatedText: entry.translatedText || '',
      siteUrl: entry.siteUrl || '',
      sourceLang: entry.sourceLang || 'ja',
      targetLang: entry.targetLang || 'id',
      translationModel: entry.translationModel || 'langbly',
      canvasSettings: entry.canvasSettings || {},
      createdAt: new Date().toISOString()
    };
    await db.put(STORE_TRANSLATIONS, record);
    await this.enforceLimit();
    return record.id;
  },
  async getById(id) {
    const db = await getDB();
    return await db.get(STORE_TRANSLATIONS, id);
  },
  async getRecent(limit = 20, offset = 0) {
    const db = await getDB();
    const tx = db.transaction(STORE_TRANSLATIONS, 'readonly');
    const all = await tx.store.getAll();
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return all.slice(offset, offset + limit);
  },
  async getAll() {
    const db = await getDB();
    const all = await db.getAll(STORE_TRANSLATIONS);
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return all;
  },
  async count() {
    const db = await getDB();
    return await db.count(STORE_TRANSLATIONS);
  },
  async delete(id) {
    const db = await getDB();
    await db.delete(STORE_TRANSLATIONS, id);
  },
  async clear() {
    const db = await getDB();
    await db.clear(STORE_TRANSLATIONS);
  },
  async enforceLimit() {
    const max = 500;
    const count = await this.count();
    if (count <= max) return;
    const all = await this.getAll();
    const toDelete = all.slice(max);
    const db = await getDB();
    const tx = db.transaction(STORE_TRANSLATIONS, 'readwrite');
    for (const entry of toDelete) {
      await tx.store.delete(entry.id);
    }
    await tx.done;
  },
  async runAutoDelete() {
    const age = await SettingsStore.get('autoDeleteAge');
    if (age === 'never') return 0;
    const cutoffMs = { '1day': 86400000, '1week': 604800000, '1month': 2592000000 }[age];
    if (!cutoffMs) return 0;
    const cutoff = Date.now() - cutoffMs;
    const all = await this.getAll();
    const toDelete = all.filter(e => new Date(e.createdAt).getTime() < cutoff);
    const db = await getDB();
    const tx = db.transaction(STORE_TRANSLATIONS, 'readwrite');
    for (const entry of toDelete) {
      await tx.store.delete(entry.id);
    }
    await tx.done;
    return toDelete.length;
  }
};
