import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Log environment mode
if (!('__TAURI__' in window) && !('__TAURI_INTERNALS__' in window)) {
  console.log('[TJS] Running in browser mode with mock data');
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
