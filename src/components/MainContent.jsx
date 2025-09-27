import React, { useState } from 'react';
import { useNotes } from '../context/NotesContext';
import EditorToolbar from './EditorToolbar';
import RichTextEditor from './RichTextEditor';
import NoteMetadata from './NoteMetadata';
import PasswordModal from './modals/PasswordModal';
import TranslationModal from './modals/TranslationModal';

const MainContent = () => {
  const { currentNote, createNote } = useNotes();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTranslationModal, setShowTranslationModal] = useState(false);

  if (!currentNote) {
    return (
      <div className="main-content">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          flexDirection: 'column',
          color: '#adb5bd',
          fontSize: '18px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📝</div>
          <p style={{ marginBottom: '20px' }}>No note selected</p>
          <button 
            onClick={createNote}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            ✏️ Create New Note
          </button>
          <p style={{ fontSize: '14px', marginTop: '15px', opacity: 0.7 }}>
            Or select an existing note from the sidebar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <EditorToolbar 
        onShowPasswordModal={() => setShowPasswordModal(true)}
        onShowTranslationModal={() => setShowTranslationModal(true)}
      />
      <RichTextEditor />
      <NoteMetadata />
      
      {showPasswordModal && (
        <PasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
      
      {showTranslationModal && (
        <TranslationModal onClose={() => setShowTranslationModal(false)} />
      )}
    </div>
  );
};

export default MainContent;
