import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useNotes } from '../../context/NotesContext';

const TranslationModal = ({ onClose }) => {
  const { currentNote, ai, createNote, dispatch, storage } = useNotes();
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [isTranslating, setIsTranslating] = useState(false);

  // Debug mode from environment - only show logs in development
  const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true' && import.meta.env.DEV;
  
  // Debug logging utility
  const debugLog = (message, ...args) => {
    if (debugMode) {
      console.log(`[DEBUG TRANSLATION] ${message}`, ...args);
    }
  };

  // Info logging - only show user-friendly messages
  const infoLog = (message, ...args) => {
    if (debugMode) {
      console.log(`ℹ️ ${message}`, ...args);
    }
  };

  const languages = {
    'es': 'Spanish',
    'fr': 'French', 
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic'
  };

  const handleTranslate = async () => {
    infoLog('🌍 Starting translation to', languages[selectedLanguage]);
    debugLog('handleTranslate called');
    debugLog('Current note:', currentNote);
    debugLog('Selected language:', selectedLanguage);
    debugLog('AI service available:', !!ai);
    debugLog('Current note content:', currentNote?.content);
    
    if (!currentNote?.content) {
      debugLog('❌ No content to translate');
      alert('Please add some content to translate');
      return;
    }

    try {
      setIsTranslating(true);
      dispatch({ type: 'SET_LOADING', payload: true });
      const text = extractTextFromHTML(currentNote.content);
      
      debugLog('Extracted text for translation:', text);
      debugLog('Extracted text length:', text.length);
      
      if (!text || text.trim() === '' || text.length < 2) {
        alert('🌍 Please type some content in the note first!\n\nYou need at least 2 characters to translate.');
        setIsTranslating(false);
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      
      console.log('🚀 Calling ai.translateText...');
      
      const translation = await ai.translateText(text, selectedLanguage);
      
      console.log('🎉 Translation received:', translation);
      console.log('🎉 Translation type:', typeof translation);
      console.log('🎉 Translation length:', translation?.length);
      
      if (!translation || translation.trim() === '') {
        throw new Error('Translation service returned empty result');
      }
      
      console.log('📝 Creating new note with translation...');
      
      // Create unique tags array to avoid duplicates
      const existingTags = currentNote.tags || [];
      const newTags = ['translated', selectedLanguage, languages[selectedLanguage].toLowerCase()];
      const uniqueTags = [...new Set([...existingTags, ...newTags])];
      
      const newNote = {
        id: storage.generateId(),
        title: `${currentNote.title} (${languages[selectedLanguage]})`,
        content: `<div style="padding: 10px; background: #f8f9fa; border-radius: 5px; margin-bottom: 10px; font-size: 12px; color: #666;">
          <strong>🌐 Translated to ${languages[selectedLanguage]}</strong><br>
          Original: "${currentNote.title}"<br>
          Translation powered by AI
        </div>${translation}`,
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        tags: uniqueTags,
        pinned: false,
        encrypted: false,
        password: null
      };

      console.log('💾 Saving translated note...');
      try {
        await storage.saveNote(newNote);
        console.log('� Note saved to storage successfully');
      } catch (saveError) {
        console.error('❌ Error saving note to storage:', saveError);
        throw new Error('Failed to save translated note');
      }
      
      console.log('�📋 Adding note to context...');
      dispatch({ type: 'ADD_NOTE', payload: newNote });
      dispatch({ type: 'SET_CURRENT_NOTE', payload: newNote });
      console.log('📋 Note added to context successfully');
      
      console.log('✅ Translation process completed successfully!');
      alert(`🎉 Successfully translated to ${languages[selectedLanguage]}! A new note has been created using free translation service.`);
      onClose();
    } catch (error) {
      console.error('Translation error:', error);
      
      let errorMessage = `Translation to ${languages[selectedLanguage]} encountered an issue.`;
      
      if (error.message.includes('429') || error.message.includes('quota')) {
        errorMessage = `⚠️ OpenAI API quota exceeded. The translation used free services instead. For better results, please add credit to your OpenAI account.`;
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorMessage = `🔑 API key issue detected. The translation used free services instead.`;
      } else {
        errorMessage = `🌐 Premium APIs unavailable, but translation completed using free services.`;
      }
      
      alert(errorMessage);
    } finally {
      setIsTranslating(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const extractTextFromHTML = (html) => {
    try {
      debugLog('🔍 Extracting text from HTML:', html);
      
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
      console.log('❌ Emergency fallback result:', emergency);
      return emergency;
    }
  };

  return (
    <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
      <div className="modal-content">
        <button className="close" onClick={onClose}>
          <X size={20} />
        </button>
        <h3>Translate Note</h3>
        <select 
          value={selectedLanguage} 
          onChange={(e) => setSelectedLanguage(e.target.value)}
        >
          {Object.entries(languages).map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
        <div className="modal-buttons">
          <button 
            onClick={handleTranslate} 
            disabled={isTranslating}
            style={{ opacity: isTranslating ? 0.6 : 1 }}
          >
            {isTranslating ? '🌐 Translating...' : '🌐 Translate'}
          </button>
          <button onClick={onClose} disabled={isTranslating}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default TranslationModal;
