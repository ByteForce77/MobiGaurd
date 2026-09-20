import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

declare global {
  interface Window {
    __launchMobiGuard?: () => void;
    __mountMobiGuard?: () => void;
    __MOBIGUARD_MOUNTED__?: boolean;
    __MOBIGUARD_AUTO_MOUNT?: boolean;
  }
}

function mountMobiGuard() {
  try {
    let rootElement = document.getElementById('root');
    if (!rootElement) {
      rootElement = document.createElement('div');
      rootElement.id = 'root';
      document.body.appendChild(rootElement);
    }

    // Completely clear existing preloader HTML
    rootElement.innerHTML = '';

    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    window.__MOBIGUARD_MOUNTED__ = true;
  } catch (err: any) {
    console.error('MobiGuard Mount Failure:', err);
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #020617; color: #f8fafc; font-family: sans-serif; padding: 24px; text-align: center;">
          <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; color: #ef4444; font-size: 24px;">⚠️</div>
          <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">MobiGuard Initialization Recovery</h2>
          <p style="color: #94a3b8; font-size: 13px; max-width: 340px; line-height: 1.5; margin: 0 0 20px 0;">The application encountered a browser environment restriction. Tap Retry to reload in Browser Demo Mode.</p>
          <button onclick="window.location.reload()" style="padding: 10px 22px; font-size: 13px; font-weight: 600; color: #020617; background: #06b6d4; border: none; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);">Retry Initialization</button>
        </div>
      `;
    }
  }
}

window.__mountMobiGuard = mountMobiGuard;

let hasMounted = false;
function safeMount() {
  if (hasMounted) return;
  hasMounted = true;
  mountMobiGuard();
}

if (document.getElementById('root')) {
  safeMount();
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeMount, { once: true });
  window.addEventListener('load', safeMount, { once: true });
  setTimeout(safeMount, 100);
} else {
  safeMount();
}
