import React, { useState } from 'react';
import { FiSend, FiPaperclip, FiMic } from 'react-icons/fi';

function MessageInput({ onSendMessage }) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message, 'text');
      setMessage('');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Implementar lógica para envio de arquivos
      console.log('Arquivo selecionado:', file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="message-input">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Digite uma mensagem"
      />
      <label htmlFor="file-upload" className="file-upload-label">
        <FiPaperclip />
      </label>
      <input
        id="file-upload"
        type="file"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      <button type="button" className="mic-btn">
        <FiMic />
      </button>
      <button type="submit" className="send-btn">
        <FiSend />
      </button>
    </form>
  );
}

export default MessageInput;