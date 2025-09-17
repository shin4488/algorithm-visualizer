import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { init } from './visualizer';

const Root: React.FunctionComponent = () => {
  useEffect(() => {
    init();
  }, []);
  return <App />;
};

const container = document.getElementById('root');
if (container instanceof HTMLElement) {
  const root = createRoot(container as Element);
  root.render(<Root />);
}
