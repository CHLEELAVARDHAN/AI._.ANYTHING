import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle Vite dynamic import errors (often happens after a restart/rebuild)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('Failed to fetch dynamically imported module')) {
    console.warn("Module import failed, reloading page...");
    event.preventDefault();
    window.location.reload();
  }
});

window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('Failed to fetch dynamically imported module')) {
    console.warn("Module import failed, reloading page...");
    event.preventDefault();
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
