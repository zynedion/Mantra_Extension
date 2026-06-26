export const ERROR_MESSAGES = {
  NO_API_KEY: {
    message: 'Google Cloud API key not set.',
    action: 'Open Settings',
    actionPayload: { tab: 'api' }
  },
  AUTH_ERROR: {
    message: 'API key is invalid or expired.',
    action: 'Check Settings',
    actionPayload: { tab: 'api' }
  },
  QUOTA_EXCEEDED: {
    message: 'Free tier quota reached. Resets monthly.',
    action: 'Try Different Provider',
    actionPayload: { tab: 'translation' }
  },
  RATE_LIMITED: {
    message: 'Too many requests. Wait a moment.',
    action: 'Retry in 30s',
    actionPayload: null
  },
  SERVER_ERROR: {
    message: 'Provider server error.',
    action: 'Retry',
    actionPayload: null
  },
  PARSE_ERROR: {
    message: 'Got an unexpected response. Try switching provider.',
    action: 'Switch Provider',
    actionPayload: { tab: 'translation' }
  },
  NETWORK_ERROR: {
    message: 'No internet connection.',
    action: 'Check Connection',
    actionPayload: null
  },
  IMAGE_CORS: {
    message: 'Could not access image due to site security.',
    action: null,
    actionPayload: null
  },
  IMAGE_LOAD_FAILED: {
    message: 'Image failed to load.',
    action: 'Retry',
    actionPayload: null
  },
  RENDER_FAILED: {
    message: 'Could not render translated image.',
    action: 'Report Issue',
    actionPayload: null
  },
  NO_TEXT_FOUND: {
    message: 'No text detected in this image.',
    action: null,
    actionPayload: null
  },
  UNKNOWN: {
    message: 'Something went wrong.',
    action: 'Retry',
    actionPayload: null
  }
};

export function getErrorDisplay(code, customMessage) {
  const def = ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN;
  return {
    message: customMessage || def.message,
    action: def.action,
    actionPayload: def.actionPayload
  };
}
