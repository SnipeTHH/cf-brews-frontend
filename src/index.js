import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './app.jsx'; // Make sure this path is correct

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
