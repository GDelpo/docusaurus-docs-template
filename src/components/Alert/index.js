import React from 'react';
import styles from './styles.module.css';

/**
 * Componente Alert/Callout reutilizable
 * 
 * Uso en MDX:
 * import Alert from '@site/src/components/Alert';
 * 
 * <Alert type="info" title="Nota importante">
 *   Contenido del mensaje aquí.
 * </Alert>
 * 
 * Tipos disponibles: info, success, warning, danger, tip
 * 
 * Props:
 * - type: 'info' | 'success' | 'warning' | 'danger' | 'tip' (default: 'info')
 * - title: string opcional
 * - icon: string o ReactNode opcional (emoji o componente)
 * - collapsible: boolean - si se puede colapsar
 * - defaultOpen: boolean - estado inicial si es collapsible
 */

const icons = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  danger: '🚫',
  tip: '💡',
};

const defaultTitles = {
  info: 'Información',
  success: 'Éxito',
  warning: 'Advertencia',
  danger: 'Peligro',
  tip: 'Consejo',
};

export default function Alert({
  type = 'info',
  title,
  icon,
  children,
  collapsible = false,
  defaultOpen = true,
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const displayIcon = icon || icons[type] || icons.info;
  const displayTitle = title || defaultTitles[type] || defaultTitles.info;

  if (collapsible) {
    return (
      <div className={`${styles.alert} ${styles[type]}`}>
        <button
          className={styles.header}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <span className={styles.icon}>{displayIcon}</span>
          <span className={styles.title}>{displayTitle}</span>
          <span className={`${styles.chevron} ${isOpen ? styles.open : ''}`}>
            ▼
          </span>
        </button>
        {isOpen && <div className={styles.content}>{children}</div>}
      </div>
    );
  }

  return (
    <div className={`${styles.alert} ${styles[type]}`}>
      <div className={styles.headerStatic}>
        <span className={styles.icon}>{displayIcon}</span>
        <span className={styles.title}>{displayTitle}</span>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
