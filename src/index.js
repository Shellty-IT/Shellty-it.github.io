import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { i18nReady } from './i18n';

// Renderujemy dopiero po załadowaniu tłumaczeń wykrytego języka.
// Eliminuje to migotanie kluczy i18n przy pierwszym renderze.
i18nReady.then(() => {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
});

reportWebVitals();
