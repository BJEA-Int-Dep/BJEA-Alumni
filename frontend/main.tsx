import React from 'react';
import { createRoot } from 'react-dom/client';

import AlumniApp from '@/app';
import { AdminPage } from '@/pages/admin';
import '@/styles/globals.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Missing root element');
}

const app = window.location.pathname.startsWith('/admin') ? (
  <AdminPage />
) : (
  <AlumniApp />
);

createRoot(root).render(
  <React.StrictMode>
    {app}
  </React.StrictMode>,
);
