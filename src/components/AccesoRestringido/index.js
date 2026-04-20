import React from 'react';
import Admonition from '@theme/Admonition';

/**
 * Reusable "Restricted access" notice.
 *
 * Usage:
 *   import AccesoRestringido from '@site/src/components/AccesoRestringido';
 *   <AccesoRestringido />
 *   <AccesoRestringido contacto="it@example.com" nombre="IT Team" mostrarLegados={false} />
 */
export default function AccesoRestringido({
  contacto = 'it@example.com',
  nombre = 'IT Team',
  mostrarLegados = false,
  enlaceLegados = '/',
}) {
  return (
    <Admonition type="caution" title="Restricted access">
      <p>Internal platform authentication is required.</p>
      <p>
        To request access, contact{' '}
        <a href={`mailto:${contacto}`}>{nombre}</a>.
      </p>
      {mostrarLegados && (
        <p>
          User provisioning is managed through{' '}
          <a href={enlaceLegados}>the user management page</a>.
        </p>
      )}
    </Admonition>
  );
}
