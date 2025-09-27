import React from 'react';
import { useNotes } from '../context/NotesContext';
import clsx from 'clsx';

const NotesList = () => {
  const { notes, currentNote, loadNote } = useNotes();

  const handleNoteClick = async (noteId) => {
    await loadNote(noteId);
  };

  // Sort notes: pinned first, then by modification date
  const sortedNotes = [...notes].sort((a, b) => {
    // First priority: pinned notes
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
    // Second priority: date modified (newest first)
    return new Date(b.dateModified) - new Date(a.dateModified);
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const extractTextFromHTML = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  return (
    <div className="notes-list">
      {sortedNotes.map(note => (
        <div
          key={note.id}
          className={clsx(
            'note-item',
            {
              'active': currentNote?.id === note.id,
              'pinned': note.pinned,
              'encrypted': note.encrypted
            }
          )}
          onClick={() => handleNoteClick(note.id)}
          title={note.pinned ? `📌 Pinned note: ${note.title || 'Untitled Note'}` : note.title || 'Untitled Note'}
        >
          <div className="note-title-preview">
            {note.title || 'Untitled Note'}
          </div>
          <div className="note-content-preview">
            {extractTextFromHTML(note.content).substring(0, 100)}
            {extractTextFromHTML(note.content).length > 100 ? '...' : ''}
          </div>
          <div className="note-meta">
            <span>{formatDate(note.dateModified)}</span>
            <span>{note.tags ? note.tags.length + ' tags' : '0 tags'}</span>
          </div>
        </div>
      ))}
      {sortedNotes.length === 0 && (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: '#6c757d',
          fontStyle: 'italic'
        }}>
          No notes found. Create your first note!
        </div>
      )}
    </div>
  );
};

export default NotesList;
