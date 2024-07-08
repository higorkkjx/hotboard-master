// components/Home.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Header from './Header';
import ChatList from './ChatList';
import Chat from './Chat';
import './Home.css';

function Home() {
  const { chave, nome } = useParams();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChats();
  }, [chave]);

  const fetchChats = async () => {
    try {
      const response = await axios.get(`https://evolucaohot.online/instance/gchats?key=${chave}`);
      const sortedChats = response.data.sort((a, b) => {
        const lastMessageA = a.data.mensagens[a.data.mensagens.length - 1];
        const lastMessageB = b.data.mensagens[b.data.mensagens.length - 1];
        return new Date(lastMessageB.data) - new Date(lastMessageA.data);
      });
      setChats(sortedChats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setLoading(false);
    }
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
  };

  return (
    <div className="home-container">
      <Header />
      <div className="content-container">
        <ChatList
          chats={chats}
          onChatSelect={handleChatSelect}
          loading={loading}
        />
        {selectedChat && (
          <Chat
            chat={selectedChat}
            userName={nome}
            chave={chave}
            onClose={() => setSelectedChat(null)}
          />
        )}
      </div>
    </div>
  );
}

export default Home;