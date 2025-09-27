class StorageManager {
  constructor() {
    // Environment variables with fallbacks
    this.dbName = import.meta.env.VITE_DB_NAME || 'NotesApp';
    this.dbVersion = parseInt(import.meta.env.VITE_DB_VERSION) || 1;
    this.storagePrefix = import.meta.env.VITE_STORAGE_PREFIX || 'notes_app_';
    this.maxNotesLimit = parseInt(import.meta.env.VITE_MAX_NOTES_LIMIT) || 1000;
    
    this.db = null;
    this.useLocalStorage = false;
    this.debugMode = import.meta.env.VITE_DEBUG_MODE === 'true';
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      // Check if IndexedDB is available
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this browser. Please use a modern browser or disable private browsing mode.'));
        return;
      }

      try {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = () => {
          const error = request.error;
          console.error('IndexedDB error:', error);
          console.warn('Falling back to localStorage');
          
          // Fallback to localStorage
          this.useLocalStorage = true;
          resolve();
        };
        
        request.onsuccess = () => {
          this.db = request.result;
          console.log('Database initialized successfully');
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          if (!db.objectStoreNames.contains('notes')) {
            const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
            notesStore.createIndex('title', 'title', { unique: false });
            notesStore.createIndex('dateModified', 'dateModified', { unique: false });
            notesStore.createIndex('pinned', 'pinned', { unique: false });
          }
          
          if (!db.objectStoreNames.contains('preferences')) {
            db.createObjectStore('preferences', { keyPath: 'key' });
          }
        };
      } catch (error) {
        console.error('IndexedDB initialization failed:', error);
        console.warn('Falling back to localStorage');
        
        // Fallback to localStorage
        this.useLocalStorage = true;
        resolve();
      }
    });
  }

  async saveNote(note) {
    if (this.useLocalStorage) {
      return this.saveNoteToLocalStorage(note);
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['notes'], 'readwrite');
      const store = transaction.objectStore('notes');
      const request = store.put(note);
      
      request.onsuccess = () => resolve(note);
      request.onerror = () => reject(request.error);
    });
  }

  saveNoteToLocalStorage(note) {
    try {
      const notes = this.getNotesFromLocalStorage();
      const existingIndex = notes.findIndex(n => n.id === note.id);
      
      if (existingIndex >= 0) {
        notes[existingIndex] = note;
      } else {
        notes.push(note);
      }
      
      localStorage.setItem('notes', JSON.stringify(notes));
      return Promise.resolve(note);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  getNotesFromLocalStorage() {
    try {
      const notesStr = localStorage.getItem('notes');
      return notesStr ? JSON.parse(notesStr) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  async getNote(id) {
    if (this.useLocalStorage) {
      const notes = this.getNotesFromLocalStorage();
      const note = notes.find(n => n.id === id);
      return Promise.resolve(note || null);
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['notes'], 'readonly');
      const store = transaction.objectStore('notes');
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllNotes() {
    if (this.useLocalStorage) {
      const notes = this.getNotesFromLocalStorage();
      notes.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.dateModified) - new Date(a.dateModified);
      });
      return Promise.resolve(notes);
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['notes'], 'readonly');
      const store = transaction.objectStore('notes');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const notes = request.result;
        notes.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.dateModified) - new Date(a.dateModified);
        });
        resolve(notes);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteNote(id) {
    if (this.useLocalStorage) {
      try {
        const notes = this.getNotesFromLocalStorage();
        const filteredNotes = notes.filter(n => n.id !== id);
        localStorage.setItem('notes', JSON.stringify(filteredNotes));
        return Promise.resolve();
      } catch (error) {
        return Promise.reject(error);
      }
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['notes'], 'readwrite');
      const store = transaction.objectStore('notes');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async searchNotes(query) {
    const allNotes = await this.getAllNotes();
    const searchTerm = query.toLowerCase();
    
    return allNotes.filter(note => {
      const titleMatch = note.title.toLowerCase().includes(searchTerm);
      const contentMatch = this.extractTextFromHTML(note.content).toLowerCase().includes(searchTerm);
      const tagsMatch = note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm));
      
      return titleMatch || contentMatch || tagsMatch;
    });
  }

  extractTextFromHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Create and export a single instance
const storageManager = new StorageManager();
export default storageManager;
