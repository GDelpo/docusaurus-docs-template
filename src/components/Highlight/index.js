import React from 'react';

/**
 * Componente Highlight para resaltar texto
 * 
 * Uso en MDX:
 * import Highlight from '@site/src/components/Highlight';
 * 
 * <Highlight color="primary">Texto destacado</Highlight>
 * <Highlight color="success">Éxito</Highlight>
 * <Highlight color="warning">Advertencia</Highlight>
 * <Highlight color="danger">Peligro</Highlight>
 */

const colors = {
  primary: {
    background: 'var(--ifm-color-primary-lightest)',
    color: 'var(--ifm-color-primary-darkest)',
  },
  success: {
    background: '#d4edda',
    color: '#155724',
  },
  warning: {
    background: '#fff3cd',
    color: '#856404',
  },
  danger: {
    background: '#f8d7da',
    color: '#721c24',
  },
  info: {
    background: '#d1ecf1',
    color: '#0c5460',
  },
};

export default function Highlight({ children, color = 'primary' }) {
  const style = colors[color] || colors.primary;
  
  return (
    <span
      style={{
        ...style,
        padding: '0.15rem 0.4rem',
        borderRadius: '4px',
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}
