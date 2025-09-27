import React, { useRef, useEffect } from 'react';
import { useNotes } from '../context/NotesContext';

const RichTextEditor = () => {
  const { currentNote, saveNote, dispatch } = useNotes();
  const editorRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    if (currentNote && titleRef.current) {
      titleRef.current.value = currentNote.title || '';
    }
  }, [currentNote]);

  useEffect(() => {
    if (currentNote && editorRef.current) {
      editorRef.current.innerHTML = currentNote.content || '';
      updateWordCount();
    }
  }, [currentNote]);

  const handleTitleChange = async (e) => {
    if (!currentNote) return;
    const updatedNote = { ...currentNote, title: e.target.value };
    await saveNote(updatedNote);
  };

  const handleTitleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.target.blur(); // Remove focus from title input
      if (editorRef.current) {
        editorRef.current.focus(); // Focus the editor
      }
    }
  };

  const handleContentChange = async () => {
    if (!currentNote || !editorRef.current) return;
    const content = editorRef.current.innerHTML;
    const updatedNote = { ...currentNote, content };
    await saveNote(updatedNote);
    updateWordCount();
  };

  const updateWordCount = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.textContent || editorRef.current.innerText;
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCountEl = document.getElementById('wordCount');
    if (wordCountEl) {
      wordCountEl.textContent = `${words.length} words`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold', false, null);
          break;
        case 'i':
          e.preventDefault();
          document.execCommand('italic', false, null);
          break;
        case 'u':
          e.preventDefault();
          document.execCommand('underline', false, null);
          break;
        case 's':
          e.preventDefault();
          handleContentChange();
          break;
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (!currentNote) return null;

  return (
    <>
      <div className="note-header">
        <input
          ref={titleRef}
          type="text"
          className="note-title"
          placeholder="✏️ Click to edit note title..."
          onChange={handleTitleChange}
          onKeyPress={handleTitleKeyPress}
          defaultValue={currentNote.title || ''}
          title="Click to edit note title, press Enter to save"
        />
        <div className="note-info">
          <span>Modified: {formatDate(currentNote.dateModified)}</span>
          <span id="wordCount">0 words</span>
        </div>
      </div>

      <div className="editor-container">
        <div
          ref={editorRef}
          className="text-editor"
          contentEditable="true"
          data-placeholder="Start writing your note..."
          onInput={handleContentChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          suppressContentEditableWarning={true}
        />
      </div>
    </>
  );
};

export default RichTextEditor;
