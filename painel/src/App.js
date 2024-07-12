import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UserList from './components/UserList';
import Analytics from './components/Analytics';

function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('https://evolucaohot.online/instance/list');
        setUsers(response.data.data);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <span className="loading loading-spinner loading-lg"></span>
    </div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Painel Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UserList users={users} />
        <Analytics users={users} />
      </div>
    </div>
  );
}

export default App;