import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useNotes } from '../../context/NotesContext';

const PasswordModal = ({ onClose }) => {
  const { currentNote, saveNote, encryption } = useNotes();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!password) {
      setError('Please enter a password');
      return;
    }

    const validation = encryption.validatePassword(password);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    try {
      const updatedNote = {
        ...currentNote,
        encrypted: true,
        tempPassword: password
      };
      await saveNote(updatedNote);
      onClose();
    } catch (error) {
      setError('Failed to encrypt note');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
      <div className="modal-content">
        <button className="close" onClick={onClose}>
          <X size={20} />
        </button>
        <h3>Password Protection</h3>
        <input
          type="password"
          placeholder="Enter password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          autoFocus
        />
        {error && (
          <div style={{ color: '#dc3545', fontSize: '14px', marginBottom: '10px' }}>
            {error}
          </div>
        )}
        <div className="modal-buttons">
          <button onClick={handleConfirm}>Encrypt</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;
