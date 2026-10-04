import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// IBM Plex — self-hosted via @fontsource, system fallbacks defined in CSS
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './index.css';

// minimal loading progress keyframe (used by LoadingState)
const style = document.createElement('style');
style.textContent = '@keyframes prog { 0% { margin-left: -33%; } 100% { margin-left: 100%; } }';
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
