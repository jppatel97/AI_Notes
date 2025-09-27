import React, { useState } from 'react';
import { useNotes } from '../../context/NotesContext';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose }) => {
  const { ai } = useNotes();
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
  };

  const checkApiStatus = () => {
    const hasOpenAI = Boolean(ai?.apiKey);
    const hasOpenRouter = Boolean(ai?.openRouterKey);
    const hasTogether = Boolean(ai?.togetherKey);
    
    return {
      hasOpenAI,
      hasOpenRouter,
      hasTogether,
      hasAny: hasOpenAI || hasOpenRouter || hasTogether
    };
  };

  const apiStatus = checkApiStatus();

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Settings</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="settings-section">
            <h3>🤖 AI Translation Status</h3>
            <p className="setting-description">
              AI translation is configured through environment variables. 
              Check the current status of your API providers below.
            </p>
            
            <div className="api-status-group">
              <div className="status-item">
                <span className="status-icon">{apiStatus.hasOpenAI ? '✅' : '❌'}</span>
                <span className="status-label">OpenAI API</span>
                <span className="status-detail">
                  {apiStatus.hasOpenAI ? 'Configured' : 'Not configured'}
                </span>
              </div>
              
              <div className="status-item">
                <span className="status-icon">{apiStatus.hasOpenRouter ? '✅' : '❌'}</span>
                <span className="status-label">OpenRouter API</span>
                <span className="status-detail">
                  {apiStatus.hasOpenRouter ? 'Configured' : 'Not configured'}
                </span>
              </div>
              
              <div className="status-item">
                <span className="status-icon">{apiStatus.hasTogether ? '✅' : '❌'}</span>
                <span className="status-label">Together AI API</span>
                <span className="status-detail">
                  {apiStatus.hasTogether ? 'Configured' : 'Not configured'}
                </span>
              </div>
              
              <div className="status-item">
                <span className="status-icon">🆓</span>
                <span className="status-label">Free Translation APIs</span>
                <span className="status-detail">Always available</span>
              </div>
              
              <div className="overall-status">
                {apiStatus.hasAny ? (
                  <div className="status-success">
                    🎉 <strong>AI Translation Ready!</strong><br/>
                    Premium AI services are configured and ready to use.
                  </div>
                ) : (
                  <div className="status-info">
                    ℹ️ <strong>Using Free Services</strong><br/>
                    No premium API keys detected. Translation will use free services with limited features.
                  </div>
                )}
              </div>
            </div>
            
            <div className="api-info">
              <h4>📝 To Configure API Keys:</h4>
              <p>Add these environment variables to your <code>.env</code> file:</p>
              <ul>
                <li><code>VITE_OPENAI_API_KEY=your_openai_key</code></li>
                <li><code>VITE_OPENROUTER_API_KEY=your_openrouter_key</code></li>
                <li><code>VITE_TOGETHER_API_KEY=your_together_key</code></li>
              </ul>
              <p><strong>Get API Keys:</strong></p>
              <ul>
                <li>
                  <strong>OpenAI:</strong> 
                  <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer">
                    platform.openai.com
                  </a>
                </li>
                <li>
                  <strong>OpenRouter:</strong> 
                  <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer">
                    openrouter.ai
                  </a> (Free tier available)
                </li>
                <li>
                  <strong>Together AI:</strong> 
                  <a href="https://together.ai" target="_blank" rel="noopener noreferrer">
                    together.ai
                  </a> (Free credits)
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={handleClose} className="cancel-button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
