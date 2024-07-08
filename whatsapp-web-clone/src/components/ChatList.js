import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/pt-br';
import ChatWindow from './ChatWindow';
import Header from './Header';

function ChatList() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const { key, name } = useParams();

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 10000); // Atualiza a cada 10 segundos
    return () => clearInterval(interval);
  }, [key]);

  const fetchChats = async () => {
    try {
      const response = await axios.get(`https://evolucaohot.online/instance/gchats?key=${key}`);
      const sortedChats = response.data.sort((a, b) => {
        const lastMessageA = a.data.mensagens[a.data.mensagens.length - 1];
        const lastMessageB = b.data.mensagens[b.data.mensagens.length - 1];
        return moment(lastMessageB.data, 'YYYY-MM-DD HH:mm').diff(moment(lastMessageA.data, 'YYYY-MM-DD HH:mm'));
      });
      setChats(sortedChats);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar chats:', error);
      setLoading(false);
    }
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
  };

  const handleCloseChat = () => {
    setSelectedChat(null);
  };

  if (loading) {
    return <div className="loading">Carregando chats...</div>;
  }

  return (
    <div className="chat-container">
      <Header />
      <div className="chat-list">
        {chats.map((chat) => (
          <div key={chat.id} className="chat-item" onClick={() => handleChatSelect(chat)}>
            <img src={chat.data.imagem} alt={chat.data.nome} className="profile-pic" />
            <div className="chat-info">
              <h3>{chat.data.nome}</h3>
              <p>{chat.data.mensagens[chat.data.mensagens.length - 1].mensagem}</p>
            </div>
          </div>
        ))}
      </div>
      {selectedChat && (
        <ChatWindow
          chat={selectedChat}
          onClose={handleCloseChat}
          userName={name}
          apiKey={key}
        />
      )}
    </div>
  );
}

export default ChatList;