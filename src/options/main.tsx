import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/fonts.ts';
import '../styles/ui.css';
import './studio.css';
import { App } from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
