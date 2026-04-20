import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function NotFound() {
  return (
    <Layout title="Página no encontrada">
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '2rem',
      }}>
        <h1 style={{ 
          fontSize: '6rem', 
          fontWeight: 800, 
          color: 'var(--ifm-color-primary)',
          margin: 0,
          lineHeight: 1,
        }}>
          404
        </h1>
        <p style={{ 
          fontSize: '1.5rem', 
          color: 'var(--ifm-color-emphasis-700)',
          marginTop: '1rem',
        }}>
          Página no encontrada
        </p>
        <p style={{ 
          color: 'var(--ifm-color-emphasis-600)',
          maxWidth: '400px',
        }}>
          Lo sentimos, la página que buscas no existe o fue movida.
        </p>
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginTop: '2rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <Link
            to="/"
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--ifm-color-primary)',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            🏠 Ir al inicio
          </Link>
          <Link
            to="/inicio/instructivos"
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--ifm-color-emphasis-200)',
              color: 'var(--ifm-font-color-base)',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            📚 Ver instructivos
          </Link>
        </div>
      </main>
    </Layout>
  );
}
