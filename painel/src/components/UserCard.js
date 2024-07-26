import React from 'react';

function UserCard({ user }) {
  const expirationDate = new Date(user.dias);
  const formattedDate = `${expirationDate.getDate().toString().padStart(2, '0')}/${(expirationDate.getMonth() + 1).toString().padStart(2, '0')}`;

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">{user.name}</h2>
        <p>Email: {user.email}</p>
        <p>Telefone: {user.phone}</p>
        <p>Vencimento: {formattedDate}</p>
        <div className="card-actions justify-end">
          <a href={`https://wa.me/${user.phone}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Chat WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

export default UserCard;