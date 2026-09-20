// v2-cache-bust
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

function mountMobiGuard() {
  let rootElement = document.getElementById('root');
  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

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
  setTimeout(safeMount, 300);
} else {
  safeMount();
}
