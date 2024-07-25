import React from 'react';

function Analytics({ users }) {
  const totalUsers = users.length;
  const connectedUsers = users.filter(user => user.phone_connected).length;
  const webhookEnabledUsers = users.filter(user => user.webhook).length;

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title mb-4">Analytics</h2>
        <div className="stats stats-vertical shadow">
          <div className="stat">
            <div className="stat-title">Total de Usuários</div>
            <div className="stat-value">{totalUsers}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Usuários Conectados</div>
            <div className="stat-value">{connectedUsers}</div>
            <div className="stat-desc">{((connectedUsers / totalUsers) * 100).toFixed(2)}% do total</div>
          </div>
          <div className="stat">
            <div className="stat-title">Webhook Ativado</div>
            <div className="stat-value">{webhookEnabledUsers}</div>
            <div className="stat-desc">{((webhookEnabledUsers / totalUsers) * 100).toFixed(2)}% do total</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;