import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useNotes } from '../context/NotesContext';

const NoteMetadata = () => {
  const { currentNote, saveNote } = useNotes();
  const [tagInput, setTagInput] = useState('');

  if (!currentNote) return null;

  const handleAddTag = async (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const newTag = tagInput.trim();
      const existingTags = currentNote.tags || [];
      
      if (!existingTags.includes(newTag)) {
        const updatedNote = {
          ...currentNote,
          tags: [...existingTags, newTag]
        };
        await saveNote(updatedNote);
      }
      
      setTagInput('');
    }
  };

  const handleRemoveTag = async (tagToRemove) => {
    const updatedTags = (currentNote.tags || []).filter(tag => tag !== tagToRemove);
    const updatedNote = { ...currentNote, tags: updatedTags };
    await saveNote(updatedNote);
  };

  return (
    <div className="note-metadata">
      <div className="tags-container">
        <label>Tags:</label>
        <div className="tags-display">
          {(currentNote.tags || []).map((tag, index) => (
            <span key={`${tag}-${index}`} className="tag">
              {tag}
              <span 
                className="remove-tag"
                onClick={() => handleRemoveTag(tag)}
              >
                <X size={12} />
              </span>
            </span>
          ))}
        </div>
        <input
          type="text"
          className="tag-input"
          placeholder="Add tag..."
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyPress={handleAddTag}
        />
      </div>

      {currentNote.aiSummary && (
        <div className="ai-summary">
          <label>AI Summary:</label>
          <p>{currentNote.aiSummary}</p>
        </div>
      )}
    </div>
  );
};

export default NoteMetadata;
