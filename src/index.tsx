import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { init } from './visualizer';

const Root = () => {
  useEffect(() => {
    init();
  }, []);
  return <App />;
};

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<Root />);
}
