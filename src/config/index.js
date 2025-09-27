/**
 * Configuration utility for React Notes App
 * Centralizes access to environment variables with type safety and defaults
 */

class Config {
  // App Information
  static get APP_NAME() {
    return import.meta.env.VITE_APP_NAME || 'React Notes App';
  }

  static get APP_VERSION() {
    return import.meta.env.VITE_APP_VERSION || '1.0.0';
  }

  static get DEBUG_MODE() {
    return import.meta.env.VITE_DEBUG_MODE === 'true';
  }

  // API Configuration
  static get API_KEYS() {
    return {
      openai: import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('openai-api-key') || '',
      openrouter: import.meta.env.VITE_OPENROUTER_API_KEY || localStorage.getItem('openrouter-api-key') || '',
      together: import.meta.env.VITE_TOGETHER_API_KEY || localStorage.getItem('together-api-key') || '',
      huggingface: import.meta.env.VITE_HUGGINGFACE_API_TOKEN || localStorage.getItem('huggingface-token') || ''
    };
  }

  static get API_BASE_URLS() {
    return {
      openai: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
      openrouter: import.meta.env.VITE_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      together: import.meta.env.VITE_TOGETHER_BASE_URL || 'https://api.together.xyz/v1',
      huggingface: import.meta.env.VITE_HUGGINGFACE_BASE_URL || 'https://api-inference.huggingface.co/models'
    };
  }

  // Storage Configuration
  static get STORAGE() {
    return {
      dbName: import.meta.env.VITE_DB_NAME || 'NotesApp',
      dbVersion: parseInt(import.meta.env.VITE_DB_VERSION) || 1,
      prefix: import.meta.env.VITE_STORAGE_PREFIX || 'notes_app_',
      maxNotes: parseInt(import.meta.env.VITE_MAX_NOTES_LIMIT) || 1000
    };
  }

  // UI Configuration
  static get UI() {
    return {
      defaultTheme: import.meta.env.VITE_DEFAULT_THEME || 'light',
      autosaveInterval: parseInt(import.meta.env.VITE_AUTOSAVE_INTERVAL) || 3000
    };
  }

  // Feature Flags
  static get FEATURES() {
    return {
      translation: import.meta.env.VITE_ENABLE_TRANSLATION !== 'false',
      encryption: import.meta.env.VITE_ENABLE_ENCRYPTION !== 'false',
      exportImport: import.meta.env.VITE_ENABLE_EXPORT_IMPORT !== 'false',
      analytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
      darkMode: import.meta.env.VITE_ENABLE_DARK_MODE !== 'false'
    };
  }

  // Security Configuration
  static get SECURITY() {
    return {
      encryptionAlgorithm: import.meta.env.VITE_ENCRYPTION_ALGORITHM || 'AES-GCM',
      passwordSalt: import.meta.env.VITE_PASSWORD_SALT || 'notes_app_secure_salt_2024'
    };
  }

  // Development Configuration
  static get DEV() {
    return {
      port: parseInt(import.meta.env.VITE_DEV_PORT) || 3000,
      hmr: import.meta.env.VITE_HMR !== 'false',
      showLogs: import.meta.env.VITE_SHOW_LOGS === 'true'
    };
  }

  // Helper Methods
  static hasApiKey(provider = 'openai') {
    return Boolean(this.API_KEYS[provider]);
  }

  static getApiKey(provider = 'openai') {
    return this.API_KEYS[provider];
  }

  static getApiBaseUrl(provider = 'openai') {
    return this.API_BASE_URLS[provider];
  }

  static isFeatureEnabled(feature) {
    return this.FEATURES[feature] || false;
  }

  static log(...args) {
    if (this.DEBUG_MODE || this.DEV.showLogs) {
      console.log('[Notes App]', ...args);
    }
  }

  static warn(...args) {
    if (this.DEBUG_MODE || this.DEV.showLogs) {
      console.warn('[Notes App]', ...args);
    }
  }

  static error(...args) {
    console.error('[Notes App]', ...args);
  }

  // Get all configuration as object (for debugging)
  static getAll() {
    return {
      app: {
        name: this.APP_NAME,
        version: this.APP_VERSION,
        debug: this.DEBUG_MODE
      },
      api: {
        keys: Object.keys(this.API_KEYS).reduce((acc, key) => {
          acc[key] = this.API_KEYS[key] ? '***configured***' : 'not configured';
          return acc;
        }, {}),
        baseUrls: this.API_BASE_URLS
      },
      storage: this.STORAGE,
      ui: this.UI,
      features: this.FEATURES,
      security: {
        algorithm: this.SECURITY.encryptionAlgorithm,
        // Don't expose salt in logs
        hasSalt: Boolean(this.SECURITY.passwordSalt)
      },
      dev: this.DEV
    };
  }
}

export default Config;
