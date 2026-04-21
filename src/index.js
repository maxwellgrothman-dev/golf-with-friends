import React from 'react';
import ReactDOM from 'react-dom/client';
import GolfScheduler from './GolfScheduler';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  React.createElement(GolfScheduler, null)
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
