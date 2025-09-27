import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useNotes } from '../../context/NotesContext';

const InsightsModal = ({ onClose }) => {
  const { notes } = useNotes();
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    generateInsights();
  }, [notes]);

  const generateInsights = () => {
    if (!notes || notes.length === 0) {
      setInsights(null);
      return;
    }

    const totalNotes = notes.length;
    const totalWords = notes.reduce((sum, note) => {
      const text = extractTextFromHTML(note.content);
      return sum + text.split(/\s+/).filter(w => w.length > 0).length;
    }, 0);

    const allTags = [];
    notes.forEach(note => {
      if (note.tags) {
        allTags.push(...note.tags);
      }
    });

    const tagFrequency = {};
    allTags.forEach(tag => {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    });

    const topTags = Object.entries(tagFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    const recentActivity = notes.filter(note => {
      const daysDiff = (new Date() - new Date(note.dateModified)) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }).length;

    const encryptedNotes = notes.filter(note => note.encrypted).length;
    const pinnedNotes = notes.filter(note => note.pinned).length;

    setInsights({
      totalNotes,
      totalWords,
      averageWordsPerNote: Math.round(totalWords / totalNotes),
      topTags,
      recentActivity,
      encryptedNotes,
      pinnedNotes
    });
  };

  const extractTextFromHTML = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  return (
    <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
      <div className="modal-content" style={{ width: '600px', maxWidth: '95%' }}>
        <button className="close" onClick={onClose}>
          <X size={20} />
        </button>
        <h3>Notes Insights</h3>
        
        {!insights ? (
          <p>No insights available. Create some notes first!</p>
        ) : (
          <div style={{ padding: '20px 0' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div style={{
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#667eea' }}>
                  {insights.totalNotes}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                  Total Notes
                </div>
              </div>
              
              <div style={{
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#667eea' }}>
                  {insights.totalWords.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                  Total Words
                </div>
              </div>
              
              <div style={{
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#667eea' }}>
                  {insights.averageWordsPerNote}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                  Avg Words/Note
                </div>
              </div>
              
              <div style={{
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#667eea' }}>
                  {insights.recentActivity}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                  Recent Activity
                </div>
              </div>
              
              <div style={{
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#667eea' }}>
                  {insights.pinnedNotes}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                  Pinned Notes
                </div>
              </div>
              
              <div style={{
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#667eea' }}>
                  {insights.encryptedNotes}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                  Encrypted Notes
                </div>
              </div>
            </div>
            
            {insights.topTags.length > 0 && (
              <div style={{ 
                marginBottom: '20px',
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <h4 style={{ color: '#495057', marginBottom: '10px', fontSize: '16px' }}>
                  Top Tags
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {insights.topTags.map(({ tag, count }) => (
                    <span 
                      key={tag}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px'
                      }}
                    >
                      {tag} ({count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsModal;
