import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { registerServiceWorker } from './registerServiceWorker';
import { initPersistence } from './store/persistence';
import { initTheme } from './store/ui';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

// Before the first render so the restored logo and theme paint immediately.
initTheme();
initPersistence();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
