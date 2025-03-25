import React from 'react';
import { createRoot } from 'react-dom/client'; // Use createRoot from react-dom/client
import './index.css'; // Import Tailwind CSS
import App from './App';

// Create a root and render the App component
const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);