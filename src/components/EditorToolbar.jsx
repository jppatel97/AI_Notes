import React, { useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Lock,
  Pin,
  Trash2,
  Bot,
  Tags,
  CheckCircle,
  Languages,
  History,
  Highlighter
} from 'lucide-react';
import { useNotes } from '../context/NotesContext';

const EditorToolbar = ({ onShowPasswordModal, onShowTranslationModal }) => {
  const { currentNote, saveNote, deleteNote, createNote, ai, dispatch, storage, notes, loadNote } = useNotes();
  const [activeFormats, setActiveFormats] = useState(new Set());

  // Debug mode from environment - only show logs in development
  const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true' && import.meta.env.DEV;
  
  // Debug logging utility
  const debugLog = (message, ...args) => {
    if (debugMode) {
      console.log(`[DEBUG TOOLBAR] ${message}`, ...args);
    }
  };

  // Info logging - only show user-friendly messages
  const infoLog = (message, ...args) => {
    if (debugMode) {
      console.log(`ℹ️ ${message}`, ...args);
    }
  };

  const handleFormat = (command) => {
    document.execCommand(command, false, null);
    updateActiveFormats();
  };

  const handleAlignment = (align) => {
    const command = align === 'left' ? 'justifyLeft' : 
                   align === 'center' ? 'justifyCenter' : 'justifyRight';
    document.execCommand(command, false, null);
  };

  const updateActiveFormats = () => {
    const formats = new Set();
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    setActiveFormats(formats);
  };

  const handleFontSizeChange = (e) => {
    const size = e.target.value;
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        const span = document.createElement('span');
        span.style.fontSize = size + 'px';
        try {
          range.surroundContents(span);
        } catch (error) {
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
        }
      }
    }
  };

  const handleTogglePin = async () => {
    if (!currentNote) return;
    const updatedNote = { ...currentNote, pinned: !currentNote.pinned };
    await saveNote(updatedNote);
  };

  const handleToggleEncryption = () => {
    if (!currentNote) return;
    if (currentNote.encrypted) {
      if (confirm('Remove password protection from this note?')) {
        const updatedNote = { 
          ...currentNote, 
          encrypted: false, 
          password: null, 
          tempPassword: null 
        };
        saveNote(updatedNote);
      }
    } else {
      onShowPasswordModal();
    }
  };

  const handleDelete = async () => {
    if (!currentNote) return;
    if (confirm(`🗑️ DELETE NOTE\n\nAre you sure you want to delete "${currentNote.title || 'Untitled Note'}"?\n\nThe note will be removed from your notes list permanently.`)) {
      const noteIdToDelete = currentNote.id;
      
      // Find another note to switch to (if any exist)
      const remainingNotes = notes.filter(note => note.id !== noteIdToDelete);
      
      // Delete the note first
      await deleteNote(noteIdToDelete);
      
      // If there are other notes, switch to the first one
      if (remainingNotes.length > 0) {
        await loadNote(remainingNotes[0].id);
      } else {
        // If no notes remain, clear the current note (show empty editor)
        dispatch({ type: 'SET_CURRENT_NOTE', payload: null });
      }
    }
  };

  const handleAISummary = async () => {
    infoLog('📝 Generating AI summary...');
    debugLog('Summary button clicked');
    debugLog('Current note content:', currentNote?.content);
    
    if (!currentNote?.content) {
      alert('Please add some content to generate a summary');
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const text = extractTextFromHTML(currentNote.content);
      debugLog('Extracted text:', text);
      debugLog('Extracted text length:', text.length);
      
      if (!text || text.trim() === '' || text.length < 5) {
        alert('✍️ Please type some content in the note first!\n\nYou need at least 5 characters to generate an AI summary.');
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      
      const summary = await ai.summarizeText(text);
      console.log('✅ TOOLBAR: Summary generated:', summary.substring(0, 100));
      
      // Create a new note with the summary instead of just adding it to current note
      const summaryNote = {
        id: storage.generateId(),
        title: `📝 Summary: ${currentNote.title}`,
        content: `<div style="background: #f0f8ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3; margin-bottom: 15px;">
          <h3 style="margin: 0 0 10px 0; color: #1976D2;">📝 AI Generated Summary</h3>
          <p style="margin: 0; font-style: italic;">${summary}</p>
        </div>
        <hr>
        <h4>Original Content:</h4>
        ${currentNote.content}`,
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        tags: [...(currentNote.tags || []), 'summary', 'ai-generated'],
        pinned: false,
        encrypted: false,
        password: null
      };
      
      await storage.saveNote(summaryNote);
      dispatch({ type: 'ADD_NOTE', payload: summaryNote });
      dispatch({ type: 'SET_CURRENT_NOTE', payload: summaryNote });
      
      alert('✅ Summary generated successfully! A new note has been created with the summary.');
    } catch (error) {
      console.error('❌ TOOLBAR: Summary generation failed:', error);
      alert('Failed to generate summary: ' + error.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleAITags = async () => {
    infoLog('🏷️ Generating AI tags...');
    debugLog('Tags button clicked');
    debugLog('Current note content:', currentNote?.content);
    
    if (!currentNote?.content) {
      alert('Please add some content to generate tags');
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const text = extractTextFromHTML(currentNote.content);
      debugLog('Extracted text:', text);
      debugLog('Extracted text length:', text.length);
      
      if (!text || text.trim() === '' || text.length < 3) {
        alert('🏷️ Please type some content in the note first!\n\nYou need at least 3 characters to generate AI tags.');
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      
      const aiTags = await ai.generateTags(text);
      console.log('✅ TOOLBAR: Tags generated:', aiTags);
      
      if (!aiTags || aiTags.length === 0) {
        alert('⚠️ No tags could be generated from the current content. Try adding more descriptive text.');
        return;
      }
      
      const existingTags = currentNote.tags || [];
      const newTags = [...new Set([...existingTags, ...aiTags])];
      const updatedNote = { ...currentNote, tags: newTags };
      
      await saveNote(updatedNote);
      console.log('💾 TOOLBAR: Note updated with new tags');
      
      // Show the generated tags to the user
      const tagsList = aiTags.map(tag => `#${tag}`).join(', ');
      alert(`🏷️ Generated ${aiTags.length} new tags: ${tagsList}`);
    } catch (error) {
      console.error('❌ TOOLBAR: Tag generation failed:', error);
      alert('Failed to generate tags: ' + error.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleGrammarCheck = async () => {
    infoLog('📝 Checking grammar with AI...');
    debugLog('Grammar button clicked');
    debugLog('Current note content:', currentNote?.content);
    
    if (!currentNote?.content) {
      alert('Please add some content to check grammar');
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const text = extractTextFromHTML(currentNote.content);
      debugLog('Extracted text:', text);
      debugLog('Extracted text length:', text.length);
      
      if (!text || text.trim() === '' || text.length < 3) {
        alert('✅ Please type some content in the note first!\n\nYou need at least 3 characters to check grammar.');
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      
      const errors = await ai.checkGrammar(text);
      console.log('✅ TOOLBAR: Grammar check completed:', errors.length, 'issues found');
      
      if (errors.length === 0) {
        alert('✅ No grammar errors found! Your text looks good.');
      } else {
        // Create a detailed grammar report
        const errorsList = errors.map((error, index) => 
          `${index + 1}. ${error.error}\n   → ${error.correction}\n   💡 ${error.explanation}`
        ).join('\n\n');
        
        // Create a new note with grammar suggestions
        const grammarNote = {
          id: storage.generateId(),
          title: `📝 Grammar Check: ${currentNote.title}`,
          content: `<div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 15px;">
            <h3 style="margin: 0 0 10px 0; color: #856404;">📝 Grammar Check Results</h3>
            <p><strong>Found ${errors.length} potential issues:</strong></p>
            <ol style="margin: 10px 0;">
              ${errors.map(error => 
                `<li style="margin: 8px 0;">
                  <strong style="color: #dc3545;">${error.error}</strong><br>
                  <span style="color: #28a745;">✓ ${error.correction}</span><br>
                  <small style="color: #6c757d;">💡 ${error.explanation}</small>
                </li>`
              ).join('')}
            </ol>
          </div>
          <hr>
          <h4>Original Content:</h4>
          ${currentNote.content}`,
          dateCreated: new Date().toISOString(),
          dateModified: new Date().toISOString(),
          tags: [...(currentNote.tags || []), 'grammar-check', 'ai-generated'],
          pinned: false,
          encrypted: false,
          password: null
        };
        
        await storage.saveNote(grammarNote);
        dispatch({ type: 'ADD_NOTE', payload: grammarNote });
        dispatch({ type: 'SET_CURRENT_NOTE', payload: grammarNote });
        
        alert(`📝 Found ${errors.length} potential grammar issues. A detailed report has been created in a new note!`);
      }
    } catch (error) {
      console.error('❌ TOOLBAR: Grammar check failed:', error);
      alert('Failed to check grammar: ' + error.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleGlossaryHighlight = async () => {
    if (!currentNote?.content) {
      alert('Please add some content to highlight terms');
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const text = extractTextFromHTML(currentNote.content);
      const terms = await ai.identifyGlossaryTerms(text);
      if (terms.length > 0) {
        alert(`Highlighted ${terms.length} key terms`);
      } else {
        alert('No key terms found to highlight');
      }
    } catch (error) {
      alert('Failed to highlight terms: ' + error.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const extractTextFromHTML = (html) => {
    debugLog('🔍 Extracting text from HTML:', html);
    
    if (!html || html.trim() === '') {
      debugLog('🔍 HTML is completely empty');
      return '';
    }
    
    // Create a temporary div to extract text content
    const div = document.createElement('div');
    div.innerHTML = html;
    
    // Get text content and clean it up
    let extractedText = div.textContent || div.innerText || '';
    extractedText = extractedText.trim();
    
    // Remove extra whitespace and line breaks but preserve meaningful content
    extractedText = extractedText.replace(/\s+/g, ' ').trim();
    
    debugLog('🔍 Extracted text result:', extractedText);
    debugLog('🔍 Extracted text length:', extractedText.length);
    
    // Check if we only have empty paragraphs or divs after text extraction
    if (extractedText === '' && html.includes('<')) {
      // Check if HTML only contains empty tags
      const cleanHTML = html.replace(/<[^>]*>/g, '').trim();
      debugLog('🔍 Clean HTML after tag removal:', cleanHTML);
      return cleanHTML;
    }
    
    return extractedText;
  };

  return (
    <div className="editor-toolbar">
      <div className="format-group">
        <button 
          className={`toolbar-btn ${activeFormats.has('bold') ? 'active' : ''}`}
          onClick={() => handleFormat('bold')}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button 
          className={`toolbar-btn ${activeFormats.has('italic') ? 'active' : ''}`}
          onClick={() => handleFormat('italic')}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button 
          className={`toolbar-btn ${activeFormats.has('underline') ? 'active' : ''}`}
          onClick={() => handleFormat('underline')}
          title="Underline"
        >
          <Underline size={16} />
        </button>
      </div>

      <div className="format-group">
        <button 
          className="toolbar-btn"
          onClick={() => handleAlignment('left')}
          title="Align Left"
        >
          <AlignLeft size={16} />
        </button>
        <button 
          className="toolbar-btn"
          onClick={() => handleAlignment('center')}
          title="Align Center"
        >
          <AlignCenter size={16} />
        </button>
        <button 
          className="toolbar-btn"
          onClick={() => handleAlignment('right')}
          title="Align Right"
        >
          <AlignRight size={16} />
        </button>
      </div>

      <div className="format-group">
        <select onChange={handleFontSizeChange} className="font-size-select">
          <option value="12">12px</option>
          <option value="14" defaultValue>14px</option>
          <option value="16">16px</option>
          <option value="18">18px</option>
          <option value="20">20px</option>
          <option value="24">24px</option>
          <option value="28">28px</option>
          <option value="32">32px</option>
        </select>
      </div>

      <div className="format-group">
        <button 
          className={`toolbar-btn ${currentNote?.encrypted ? 'active' : ''}`}
          onClick={handleToggleEncryption}
          title="Encrypt Note"
        >
          <Lock size={16} />
        </button>
        <button 
          className={`toolbar-btn ${currentNote?.pinned ? 'active' : ''}`}
          onClick={handleTogglePin}
          title="Pin Note"
        >
          <Pin size={16} />
        </button>
        <button 
          className="toolbar-btn delete-btn"
          onClick={handleDelete}
          title="Delete Note"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="format-group">
        <button 
          className="toolbar-btn ai-btn"
          onClick={handleAISummary}
          title="AI Summary"
        >
          <Bot size={14} />
          Summary
        </button>
        <button 
          className="toolbar-btn ai-btn"
          onClick={handleAITags}
          title="AI Tags"
        >
          <Tags size={14} />
          Tags
        </button>
        <button 
          className="toolbar-btn ai-btn"
          onClick={handleGrammarCheck}
          title="Grammar Check"
        >
          <CheckCircle size={14} />
          Grammar
        </button>
        <button 
          className="toolbar-btn ai-btn"
          onClick={onShowTranslationModal}
          title="Translate"
        >
          <Languages size={14} />
          Translate
        </button>
        <button 
          className="toolbar-btn"
          onClick={handleGlossaryHighlight}
          title="Highlight Terms"
        >
          <Highlighter size={16} />
        </button>
      </div>
    </div>
  );
};

export default EditorToolbar;
