/**
 * Contribute CMS — Entry point.
 *
 * Registered by the admin-cms plugin for /contribuir/*.
 * Uses Docusaurus Layout (navbar + footer) for a familiar UX.
 * Wrapped in BrowserOnly to prevent SSR issues.
 */
import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Head from '@docusaurus/Head';
import Layout from '@theme/Layout';

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
      color: '#71717a',
      fontFamily: 'system-ui, sans-serif',
      fontSize: 14,
    }}>
      Cargando...
    </div>
  );
}

export default function ContributePage() {
  return (
    <Layout title="Contribuir" description="Creá y editá documentación">
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <BrowserOnly fallback={<LoadingScreen />}>
        {() => {
          const ContributeApp = require('./ContributeApp').default;
          return <ContributeApp />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
