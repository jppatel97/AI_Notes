import React, { useState, useRef } from 'react';
import { Plus, Search, BarChart3, Download, Upload, Moon, Sun } from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import NotesList from './NotesList';
import ExportModal from './modals/ExportModal';
import InsightsModal from './modals/InsightsModal';


const Sidebar = ({ isOpen = true, onClose, isMobile = false }) => {
  const { createNote, searchNotes, toggleTheme, theme, storage, dispatch, dbReady, loading } = useNotes();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);

  const fileInputRef = useRef(null);

  const handleNewNote = async () => {
    try {
      await createNote();
    } catch (error) {
      console.error('Error creating note:', error);
      
      // Provide specific error messages based on the error
      let errorMessage = 'Unable to create new note. ';
      
      if (error.message.includes('Database not ready')) {
        errorMessage += 'The app is still loading. Please wait a moment and try again.';
      } else if (error.message.includes('Storage not available')) {
        errorMessage += 'Please refresh the page and try again.';
      } else if (error.message.includes('storage permissions')) {
        errorMessage += 'Please check your browser storage permissions. Make sure you\'re not in private/incognito mode.';
      } else {
        errorMessage += 'Please try refreshing the page. If the problem persists, try clearing your browser cache.';
      }
      
      alert(errorMessage);
    }
  };

  const handleSearch = (e) => {
    searchNotes(e.target.value);
  };

  const handleImport = () => {
    fileInputRef.current.click();
  };

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (importData.notes && Array.isArray(importData.notes)) {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        for (const note of importData.notes) {
          // Add imported notes with new IDs to avoid conflicts
          const newNote = {
            ...note,
            id: storage.generateId(),
            dateCreated: new Date().toISOString(),
            dateModified: new Date().toISOString()
          };
          await storage.saveNote(newNote);
        }
        
        // Refresh notes list
        const allNotes = await storage.getAllNotes();
        dispatch({ type: 'SET_NOTES', payload: allNotes });
        
        alert(`Successfully imported ${importData.notes.length} notes!`);
      } else {
        alert('Invalid file format. Please select a valid notes export file.');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing file. Please check the file format.');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      event.target.value = ''; // Reset file input
    }
  };

  return (
    <div className={`sidebar ${isMobile ? (isOpen ? 'sidebar-mobile-open' : 'sidebar-mobile-closed') : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <h1>
            📝 Notes
          </h1>
          {isMobile && (
            <button 
              className="mobile-close-btn"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          )}
        </div>
        <div className="header-actions">
          <button 
            className="icon-btn" 
            onClick={toggleTheme}
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button 
            className="icon-btn" 
            onClick={() => setShowInsightsModal(true)}
            title="View Insights"
          >
            <BarChart3 size={18} />
          </button>
          <button 
            className="icon-btn" 
            onClick={handleImport}
            title="Import Notes"
          >
            <Upload size={18} />
          </button>
          <button 
            className="icon-btn" 
            onClick={() => setShowExportModal(true)}
            title="Export Notes"
          >
            <Download size={18} />
          </button>
        </div>
        <button 
          className="new-note-btn" 
          onClick={handleNewNote}
          disabled={!dbReady || loading}
          style={{ 
            opacity: (!dbReady || loading) ? 0.6 : 1,
            cursor: (!dbReady || loading) ? 'not-allowed' : 'pointer'
          }}
          title={!dbReady ? 'Loading database...' : 'Create new note'}
        >
          <Plus size={18} />
          {!dbReady ? 'Loading...' : 'New Note'}
        </button>
      </div>
      
      <div className="search-container">
        <input
          type="text"
          placeholder="Search notes..."
          className="search-input"
          onChange={handleSearch}
        />
        <Search className="search-icon" size={18} />
      </div>
      
      <NotesList />
      
      <input 
        type="file" 
        ref={fileInputRef}
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />
      
      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}
      
      {showInsightsModal && (
        <InsightsModal onClose={() => setShowInsightsModal(false)} />
      )}
      

    </div>
  );
};

export default Sidebar;
