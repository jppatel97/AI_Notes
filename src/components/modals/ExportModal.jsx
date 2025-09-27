import React from 'react';
import { X, FileCode, FileText } from 'lucide-react';
import { useNotes } from '../../context/NotesContext';

const ExportModal = ({ onClose }) => {
  const { notes, storage } = useNotes();

  const exportAsJSON = async () => {
    if (notes.length === 0) {
      alert('No notes to export');
      return;
    }

    const exportData = {
      notes: notes,
      exportDate: new Date().toISOString(),
      version: '1.0',
      format: 'json'
    };
    
    downloadFile(
      JSON.stringify(exportData, null, 2),
      `notes-export-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
    
    onClose();
  };

  const exportAsMarkdown = async () => {
    if (notes.length === 0) {
      alert('No notes to export');
      return;
    }

    let markdown = `# Notes Export\n\nExported on: ${new Date().toLocaleString()}\n\n`;
    
    notes.forEach(note => {
      markdown += `## ${note.title || 'Untitled Note'}\n\n`;
      markdown += `**Created:** ${new Date(note.dateCreated).toLocaleString()}\n`;
      markdown += `**Modified:** ${new Date(note.dateModified).toLocaleString()}\n`;
      
      if (note.tags && note.tags.length > 0) {
        markdown += `**Tags:** ${note.tags.join(', ')}\n`;
      }
      
      markdown += `\n${htmlToMarkdown(note.content)}\n\n---\n\n`;
    });
    
    downloadFile(
      markdown,
      `notes-export-${new Date().toISOString().split('T')[0]}.md`,
      'text/markdown'
    );
    
    onClose();
  };

  const htmlToMarkdown = (html) => {
    let markdown = html;
    
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_');
    markdown = markdown.replace(/<br[^>]*>/gi, '\n');
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    markdown = markdown.replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n');
    markdown = markdown.replace(/<[^>]+>/g, '');
    
    return markdown.trim();
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
      <div className="modal-content">
        <button className="close" onClick={onClose}>
          <X size={20} />
        </button>
        <h3>Export Notes</h3>
        <div className="export-options">
          <button className="export-btn" onClick={exportAsJSON}>
            <FileCode size={20} />
            Export as JSON
          </button>
          <button className="export-btn" onClick={exportAsMarkdown}>
            <FileText size={20} />
            Export as Markdown
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
