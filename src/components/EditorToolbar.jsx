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
    debugLog('Current note:', currentNote);
    debugLog('Current note content type:', typeof currentNote?.content);
    debugLog('Current note content raw:', JSON.stringify(currentNote?.content));
    
    if (!currentNote?.content) {
      alert('Please add some content to generate a summary');
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const text = extractTextFromHTML(currentNote.content);
      debugLog('Final extracted text:', `"${text}"`);
      debugLog('Final extracted text length:', text.length);
      
      if (!text || text.trim() === '' || text.length < 5) {
        const debugInfo = {
          htmlLength: currentNote.content ? currentNote.content.length : null,
          htmlContent: currentNote.content || '',
          extractedText: text || '',
          textLength: text ? text.length : 0,
          environment: import.meta.env.PROD ? 'Production' : 'Development',
          timestamp: new Date().toISOString()
        };
        
        console.error('❌ SUMMARY: Text extraction failed:', debugInfo);
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
        const debugInfo = {
          htmlLength: currentNote.content ? currentNote.content.length : null,
          htmlContent: currentNote.content || '',
          extractedText: text || '',
          textLength: text ? text.length : 0,
          environment: import.meta.env.PROD ? 'Production' : 'Development',
          timestamp: new Date().toISOString()
        };
        
        console.error('❌ TAGS: Text extraction failed:', debugInfo);
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
    try {
      debugLog('🔍 Extracting text from HTML:', html);
      debugLog('🔍 HTML type:', typeof html);
      debugLog('🔍 HTML === null:', html === null);
      debugLog('🔍 HTML === undefined:', html === undefined);
      
      if (!html || html.trim() === '') {
        debugLog('🔍 HTML is completely empty');
        return '';
      }
      
      // Handle empty HTML patterns with comprehensive checking
      const trimmedHtml = html.trim();
      debugLog('🔍 Trimmed HTML for comparison:', `"${trimmedHtml}"`);
      debugLog('🔍 Trimmed HTML length:', trimmedHtml.length);
      
      // Comprehensive empty pattern detection
      const emptyPatterns = [
        '<p></p>',
        '<div></div>', 
        '<p><br></p>',
        '<div><br></div>',
        '<p>&nbsp;</p>',
        '<p> </p>',
        '<div> </div>',
        '<br>',
        '<br/>',
        '<br />',
        '',
        ' '
      ];
      
      const isEmptyPattern = emptyPatterns.some(pattern => trimmedHtml === pattern);
      debugLog('🔍 Checking against empty patterns:', isEmptyPattern);
      
      if (isEmptyPattern) {
        debugLog('🔍 HTML contains only empty tags, returning empty string');
        return '';
      }
      
      // Additional check: if regex extraction would result in empty string
      const testExtraction = trimmedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      if (!testExtraction || testExtraction === '') {
        debugLog('🔍 Test extraction is empty, returning empty string');
        return '';
      }
      
      let extractedText = '';
      
      // For production environments, prioritize regex-based extraction
      // as DOM methods can be unreliable in server-side rendering contexts
      if (import.meta.env.PROD) {
        debugLog('🔍 Production mode: Using regex extraction method');
        extractedText = html
          .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remove style tags and content
          .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags and content
          .replace(/<[^>]*>/g, '') // Remove all HTML tags
          .replace(/&nbsp;/g, ' ') // Replace &nbsp; entities
          .replace(/&amp;/g, '&') // Replace &amp; entities
          .replace(/&lt;/g, '<') // Replace &lt; entities
          .replace(/&gt;/g, '>') // Replace &gt; entities
          .replace(/&quot;/g, '"') // Replace &quot; entities
          .replace(/&#39;/g, "'") // Replace &#39; entities
          .replace(/&hellip;/g, '...'); // Replace &hellip; entities
      } else {
        // Development mode: Try DOM methods first, fallback to regex
        try {
          const div = document.createElement('div');
          div.innerHTML = html;
          
          const textContent = div.textContent;
          const innerTextContent = div.innerText;
          
          if (textContent && textContent.trim().length > 0) {
            extractedText = textContent;
            debugLog('🔍 Used textContent method');
          } else if (innerTextContent && innerTextContent.trim().length > 0) {
            extractedText = innerTextContent;
            debugLog('🔍 Used innerText method');
          } else {
            throw new Error('DOM extraction returned empty');
          }
        } catch (domError) {
          debugLog('🔍 DOM extraction failed, using regex method:', domError.message);
          extractedText = html
            .replace(/<style[^>]*>.*?<\/style>/gi, '')
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&hellip;/g, '...');
        }
      }
      
      // Clean up the extracted text
      extractedText = extractedText
        .replace(/\u00A0/g, ' ') // Replace non-breaking spaces (Unicode)
        .replace(/\u2000-\u200F/g, ' ') // Replace various Unicode spaces
        .replace(/\u2028-\u2029/g, ' ') // Replace line and paragraph separators
        .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
        .trim();
      
      debugLog('🔍 Extracted text result:', `"${extractedText}"`);
      debugLog('🔍 Extracted text length:', extractedText.length);
      
      if (debugMode) {
        debugLog('🔍 Character codes:', extractedText.split('').slice(0, 20).map(c => c.charCodeAt(0)));
      }
      
      // Final safety check: never return the string "null" or "undefined"
      if (extractedText === 'null' || extractedText === 'undefined' || extractedText === null || extractedText === undefined) {
        debugLog('🔍 Final safety: converting null/undefined to empty string');
        return '';
      }
      
      return extractedText;
    } catch (error) {
      console.error('❌ Critical error in extractTextFromHTML:', error);
      console.log('❌ Input HTML:', html);
      // Emergency fallback - just return the HTML with basic tag removal
      const emergency = (html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      console.log('❌ Emergency fallback result:', `"${emergency}"`);
      // Make sure we never return the string "null"
      return emergency === 'null' ? '' : emergency;
    }
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
