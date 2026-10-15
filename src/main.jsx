import './utils/safeStorage';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Fade out the boot loader from index.html once the app has painted.
const bootLoader = document.getElementById('boot-loader');
if (bootLoader) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bootLoader.classList.add('is-done');
    setTimeout(() => bootLoader.remove(), 500);
  }));
}
