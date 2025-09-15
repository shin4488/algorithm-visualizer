import React from 'react';
import { createRoot } from 'react-dom/client';

const App: React.FC = () => null;

const container = document.getElementById('react-root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
