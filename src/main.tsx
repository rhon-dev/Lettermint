import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { registerServiceWorker } from './registerServiceWorker';
import { selectFont } from './lib/glyphs';
import { useLogoStore } from './store/logo';
import { initPersistence } from './store/persistence';
import { initTheme } from './store/ui';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

// Before the first render so the restored logo and theme paint immediately.
initTheme();
initPersistence();
// Start the parser + font download now instead of after the first render, so the logo appears sooner.
void selectFont(useLogoStore.getState().fontId, useLogoStore.getState().weight);

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
