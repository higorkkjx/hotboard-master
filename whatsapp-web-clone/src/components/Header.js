import React from 'react';
import { FiMenu, FiMessageCircle, FiMoreVertical } from 'react-icons/fi';

function Header() {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <FiMenu className="header-icon" />
        </div>
        <h1>WhatsApp HotBoard</h1>
        <div className="header-right">
          <FiMessageCircle className="header-icon" />
          <FiMoreVertical className="header-icon" />
        </div>
      </div>
    </header>
  );
}

export default Header;