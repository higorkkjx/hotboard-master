// components/Chat.js
import React, { useRef, useEffect } from 'react';
import MessageInput from './MessageInput';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import './Chat.css';

function Chat({ chat, userName, chave, onClose }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  return (
    <div className="chat-container">
      <div className="chat-header">
        <img src={chat.data.imagem} alt={chat.data.nome} className="chat-avatar" />
        <h2>{chat.data.nome}</h2>
        <button className="close-button" onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      <div className="messages-container">
        {chat.data.mensagens.map((message, index) => (
          <div
            key={index}
            className={`message ${message.user === userName ? 'own-message' : 'other-message'}`}
          >
            <p className="message-user">{message.user}</p>
            <p className="message-text">{message.mensagem}</p>
            <p className="message-time">{message.data}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput chatId={chat.id} chave={chave} />
    </div>
  );
}

export default Chat;