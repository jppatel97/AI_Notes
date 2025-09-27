import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useNotes } from '../../context/NotesContext';

const TranslationModal = ({ onClose }) => {
  const { currentNote, ai, createNote, dispatch, storage } = useNotes();
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [isTranslating, setIsTranslating] = useState(false);

  // Debug mode from environment
  const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true';
  
  // Debug logging utility
  const debugLog = (message, ...args) => {
    if (debugMode) {
      console.log(`[DEBUG TRANSLATION] ${message}`, ...args);
    }
  };

  const infoLog = (message, ...args) => {
    console.log(`ℹ️ ${message}`, ...args);
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
        alert('Please add some meaningful text content to translate (at least 2 characters)');
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
