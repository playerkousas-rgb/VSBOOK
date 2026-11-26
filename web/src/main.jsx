import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { registerPwa } from './pwa.js';

// A blocked entry must not boot the book or register an installable PWA.
if (!document.documentElement.hasAttribute('data-store-gated')) {
  registerPwa();
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
