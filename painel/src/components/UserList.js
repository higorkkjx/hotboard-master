import React from 'react';
import UserCard from './UserCard';

function UserList({ users }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <h2 className="text-2xl font-semibold mb-4">Lista de Usuários</h2>
      {users.map((user) => (
        <UserCard key={user.instance_key} user={user} />
      ))}
    </div>
  );
}

export default UserList;