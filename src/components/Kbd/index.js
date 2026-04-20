import React from 'react';

/**
 * Componente Kbd para mostrar atajos de teclado
 * 
 * Uso en MDX:
 * import Kbd from '@site/src/components/Kbd';
 * 
 * Presiona <Kbd>Ctrl</Kbd> + <Kbd>C</Kbd> para copiar.
 * 
 * O con shortcut:
 * <Kbd shortcut="Ctrl+Shift+P" />
 */

const kbdStyles = {
  display: 'inline-block',
  padding: '0.15rem 0.4rem',
  fontSize: '0.85em',
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  lineHeight: 1.4,
  color: 'var(--ifm-color-emphasis-800)',
  background: 'var(--ifm-color-emphasis-100)',
  border: '1px solid var(--ifm-color-emphasis-300)',
  borderRadius: '4px',
  boxShadow: '0 1px 1px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6)',
  whiteSpace: 'nowrap',
};

export default function Kbd({ children, shortcut }) {
  if (shortcut) {
    const keys = shortcut.split('+');
    return (
      <span>
        {keys.map((key, idx) => (
          <React.Fragment key={idx}>
            <kbd style={kbdStyles}>{key.trim()}</kbd>
            {idx < keys.length - 1 && <span style={{ margin: '0 0.25rem', opacity: 0.6 }}>+</span>}
          </React.Fragment>
        ))}
      </span>
    );
  }

  return <kbd style={kbdStyles}>{children}</kbd>;
}
