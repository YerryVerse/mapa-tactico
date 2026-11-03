import React from 'react';
import ReactDOM from 'react-dom/client';
import Portal from '../components/map/Portal';
import {LanguageProvider} from '../components/LanguageProvider';
import '../app/globals.css';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <LanguageProvider>
        <Portal />
      </LanguageProvider>
    </React.StrictMode>
  );
}
