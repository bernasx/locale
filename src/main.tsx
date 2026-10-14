import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import './styles.css';
import App from './app';

const root = document.getElementById('root')!;
const app = <React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>;
if (window.location.pathname === '/' && root.dataset.prerendered === 'true') hydrateRoot(root, app);
else createRoot(root).render(app);
