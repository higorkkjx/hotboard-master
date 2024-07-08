import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/pt-br';
import MessageInput from './MessageInput';

function ChatWindow({ chat, onClose, userName, apiKey }) {
  const [messages, setMessages] = useState(chat.data.mensagens);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (message, type) => {
    try {
      let response;
      if (type === 'text') {
        response = await axios.post(`https://evolucaohot.online/message/text?key=${apiKey}`, {
          id: chat.id,
          typeId: 'user',
          message: message,
          options: { delay: 0 }
        });
      } else if (type === 'file') {
        // Implementar lógica para envio de arquivos
      }

      if (response.status === 200) {
        const newMessage = {
          data: moment().format('YYYY-MM-DD HH:mm'),
          user: userName,
          mensagem: message
        };
        setMessages([...messages, newMessage]);
        showSuccessPopup('Mensagem enviada');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const showSuccessPopup = (message) => {
    const popup = document.createElement('div');
    popup.className = 'success-popup';
    popup.textContent = message;
    document.body.appendChild(popup);
    setTimeout(() => {
      document.body.removeChild(popup);
    }, 1000);
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <img src={chat.data.imagem} alt={chat.data.nome} className="profile-pic" />
        <h2>{chat.data.nome}</h2>
        <button onClick={onClose} className="close-btn">X</button>
      </div>
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.user === userName ? 'sent' : 'received'}`}>
            <p>{message.mensagem}</p>
            <span className="message-time">{moment(message.data, 'YYYY-MM-DD HH:mm').format('HH:mm')}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}

export default ChatWindow;
