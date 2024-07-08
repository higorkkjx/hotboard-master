import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ChatList from './components/ChatList';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/whats/:key/:name" element={<ChatList />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;