import React from 'react';
import markup from './markup';
import styles from './styles';

const App: React.FC = () => (
  <>
    <style>{styles}</style>
    <div dangerouslySetInnerHTML={{ __html: markup }} />
  </>
);

export default App;
