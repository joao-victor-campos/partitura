import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Ask the browser not to evict IndexedDB (our only copy of the progress until sync exists).
// Best effort: older browsers lack it and the request may be refused.
void (async () => {
  await navigator.storage?.persist?.();
})().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
