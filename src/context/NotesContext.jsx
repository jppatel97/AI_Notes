import React, { createContext, useContext, useReducer, useEffect } from 'react';
import storage from '../services/storage';
import EncryptionManager from '../services/encryption';
import AIManager from '../services/ai';

const NotesContext = createContext();

const notesReducer = (state, action) => {
  switch (action.type) {
    case 'SET_NOTES':
      return { ...state, notes: action.payload };
    case 'ADD_NOTE':
      return { ...state, notes: [action.payload, ...state.notes] };
    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: state.notes.map(note =>
          note.id === action.payload.id ? action.payload : note
        )
      };
    case 'DELETE_NOTE':
      return {
        ...state,
        notes: state.notes.filter(note => note.id !== action.payload)
      };
    case 'SET_CURRENT_NOTE':
      return { ...state, currentNote: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_DB_READY':
      return { ...state, dbReady: action.payload };
    default:
      return state;
  }
};

// Sample notes for initial display
const createSampleNotes = () => {
  const now = new Date().toISOString();
  return [
    {
      id: 'sample-1',
      title: '🚀 Welcome to Notes App',
      content: '<h2>Getting Started</h2><p>This is your first note! You can:</p><ul><li>Create new notes with the "New Note" button</li><li>Use rich text formatting</li><li>Translate notes to different languages with AI</li><li>Search through your notes</li><li>Encrypt sensitive notes with passwords</li></ul><p><strong>Pro tip:</strong> AI translation is automatically enabled if API keys are configured in your environment!</p>',
      dateCreated: now,
      dateModified: now,
      tags: ['welcome', 'getting-started'],
      isEncrypted: false
    },
    {
      id: 'sample-2', 
      title: '⚙️ API Configuration',
      content: '<h2>🤖 AI Translation Setup</h2><p>AI translation is automatically configured through environment variables. The system supports multiple AI providers:</p><ul><li><strong>✅ OpenAI ChatGPT:</strong> Configured via <code>VITE_OPENAI_API_KEY</code></li><li><strong>🔄 OpenRouter:</strong> Alternative via <code>VITE_OPENROUTER_API_KEY</code></li><li><strong>🆓 Free Services:</strong> MyMemory and other free APIs as fallbacks</li></ul><p><strong>Current Status:</strong></p><div id="ai-status" style="background: #e8f5e8; padding: 10px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #4caf50;"><p>🟢 <strong>AI Translation Ready!</strong><br>Environment variables are properly configured.</p></div><p><em>Translation works seamlessly without additional setup. Just select text and click the translate button!</em></p>',
      dateCreated: now,
      dateModified: now,
      tags: ['configuration', 'api', 'ai'],
      isEncrypted: false
    },
    {
      id: 'sample-3',
      title: '📝 Sample Note with Translation',
      content: '<h2>Multilingual Support</h2><p>This note demonstrates the translation feature. Once you configure your API keys, you can:</p><ul><li>Translate any note to 20+ languages</li><li>Preserve formatting during translation</li><li>Use multiple AI providers as fallbacks</li></ul><p><em>Try selecting this text and using the translate button in the toolbar!</em></p><blockquote><p>"The limits of my language mean the limits of my world." - Ludwig Wittgenstein</p></blockquote>',
      dateCreated: now,
      dateModified: now,
      tags: ['translation', 'example', 'multilingual'],
      isEncrypted: false
    }
  ];
};

const initialState = {
  notes: createSampleNotes(),
  currentNote: null,
  searchQuery: '',
  loading: false,
  theme: import.meta.env.VITE_DEFAULT_THEME || 'light',
  dbReady: false,
  appName: import.meta.env.VITE_APP_NAME || 'React Notes App',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  enableFeatures: {
    translation: import.meta.env.VITE_ENABLE_TRANSLATION !== 'false',
    encryption: import.meta.env.VITE_ENABLE_ENCRYPTION !== 'false',
    exportImport: import.meta.env.VITE_ENABLE_EXPORT_IMPORT !== 'false',
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
    darkMode: import.meta.env.VITE_ENABLE_DARK_MODE !== 'false'
  }
};

export const NotesProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notesReducer, initialState);
  
  const encryption = new EncryptionManager();
  const ai = new AIManager();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Initialize database first
        await storage.initDB();
        dispatch({ type: 'SET_DB_READY', payload: true });
        
        // Initialize AI service
        await ai.initializeAPI();
        
        // Load existing notes
        const notes = await storage.getAllNotes();
        dispatch({ type: 'SET_NOTES', payload: notes });
        
        // Load theme preferences
        const savedTheme = localStorage.getItem('app_theme') || 'light';
        dispatch({ type: 'SET_THEME', payload: savedTheme });
        document.body.setAttribute('data-theme', savedTheme);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        dispatch({ type: 'SET_DB_READY', payload: false });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    initializeApp();
  }, []);

  const createNote = async () => {
    try {
      // Check if database is ready
      if (!state.dbReady) {
        throw new Error('Database not ready. Please wait a moment and try again.');
      }

      // Check if storage is available
      if (!storage) {
        throw new Error('Storage not available. Please refresh the page and try again.');
      }

      const newNote = {
        id: storage.generateId(),
        title: 'Untitled Note',
        content: '<p></p>',
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        tags: [],
        pinned: false,
        encrypted: false,
        password: null
      };

      await storage.saveNote(newNote);
      dispatch({ type: 'ADD_NOTE', payload: newNote });
      dispatch({ type: 'SET_CURRENT_NOTE', payload: newNote });
      
      return newNote;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  };

  const saveNote = async (note) => {
    if (!note) return;
    
    // Ensure unique tags to prevent duplicate key errors
    const uniqueTags = note.tags ? [...new Set(note.tags)] : [];
    
    const updatedNote = {
      ...note,
      tags: uniqueTags,
      dateModified: new Date().toISOString()
    };

    if (note.encrypted && note.tempPassword) {
      updatedNote.content = await encryption.encrypt(note.content, note.tempPassword);
      updatedNote.password = await encryption.hashPassword(note.tempPassword);
    }

    await storage.saveNote(updatedNote);
    dispatch({ type: 'UPDATE_NOTE', payload: updatedNote });
    return updatedNote;
  };

  const deleteNote = async (noteId) => {
    await storage.deleteNote(noteId);
    dispatch({ type: 'DELETE_NOTE', payload: noteId });
  };

  const loadNote = async (noteId) => {
    const note = await storage.getNote(noteId);
    if (!note) return null;

    if (note.encrypted && note.password) {
      const password = prompt('Enter password to decrypt this note:');
      if (!password) return null;

      try {
        const decryptedContent = await encryption.decrypt(note.content, password);
        note.content = decryptedContent;
        note.tempPassword = password;
      } catch (error) {
        alert('Incorrect password or corrupted data');
        return null;
      }
    }

    dispatch({ type: 'SET_CURRENT_NOTE', payload: note });
    return note;
  };

  const searchNotes = async (query) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
    if (query.trim()) {
      const results = await storage.searchNotes(query);
      dispatch({ type: 'SET_NOTES', payload: results });
    } else {
      const allNotes = await storage.getAllNotes();
      dispatch({ type: 'SET_NOTES', payload: allNotes });
    }
  };

  const toggleTheme = () => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    dispatch({ type: 'SET_THEME', payload: newTheme });
    localStorage.setItem('app_theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
  };



  const value = {
    ...state,
    dispatch,
    storage,
    encryption,
    ai,
    createNote,
    saveNote,
    deleteNote,
    loadNote,
    searchNotes,
    toggleTheme
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};
