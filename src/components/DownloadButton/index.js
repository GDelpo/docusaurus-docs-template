import React from 'react';
import styles from './styles.module.css';

/**
 * Componente DownloadButton para descargas destacadas
 * 
 * Uso en MDX:
 * import DownloadButton from '@site/src/components/DownloadButton';
 * 
 * <DownloadButton 
 *   href="./assets/downloads/archivo.xlsx"
 *   filename="archivo.xlsx"
 *   size="2.5 MB"
 * >
 *   Descargar planilla
 * </DownloadButton>
 */
export default function DownloadButton({ href, filename, size, children }) {
  return (
    <a 
      href={href} 
      download={filename || true}
      className={styles.downloadButton}
    >
      <span className={styles.downloadIcon}>⬇️</span>
      <span className={styles.downloadText}>
        <span className={styles.downloadLabel}>{children || 'Descargar archivo'}</span>
        {(filename || size) && (
          <span className={styles.downloadMeta}>
            {filename && <span className={styles.downloadFilename}>{filename}</span>}
            {size && <span className={styles.downloadSize}>{size}</span>}
          </span>
        )}
      </span>
    </a>
  );
}
