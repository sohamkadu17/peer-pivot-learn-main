import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('Main.tsx loading...');

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; font-family: sans-serif;"><h1>Error: Root element not found</h1><p>The application failed to load. Please refresh the page.</p></div>';
} else {
  try {
    console.log('Creating React root...');
    createRoot(rootElement).render(<App />);
    console.log('React app rendered successfully!');
  } catch (error) {
    console.error('Error rendering React app:', error);
    document.body.innerHTML = `<div style="padding: 20px; font-family: sans-serif; color: red;"><h1>Error Loading Application</h1><pre>${error}</pre></div>`;
  }
}
