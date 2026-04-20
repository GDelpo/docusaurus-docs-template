/**
 * Admin CMS — Entry point.
 *
 * This is the component registered by the admin-cms plugin for /dashboard/*.
 * It wraps everything in BrowserOnly to prevent SSR issues during Docusaurus build
 * (MDXEditor, React Query, and dynamic API calls are browser-only).
 */
import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Head from '@docusaurus/Head';

function LoadingScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#09090b',
        color: '#71717a',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
      }}
    >
      Cargando panel de administración...
    </div>
  );
}

export default function AdminPage() {
  return (
    <>
      <Head>
        <title>Dashboard — Docs</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <BrowserOnly fallback={<LoadingScreen />}>
        {() => {
          // Dynamic require ensures this code only runs client-side
          const AdminApp = require('./AdminApp').default;
          return <AdminApp />;
        }}
      </BrowserOnly>
    </>
  );
}
