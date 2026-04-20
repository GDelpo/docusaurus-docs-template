import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

/**
 * Componente Card para mostrar enlaces destacados
 * 
 * Uso en MDX:
 * import Card from '@site/src/components/Card';
 * 
 * <Card title="Título" link="/ruta" icon="📄">
 *   Descripción breve
 * </Card>
 * 
 * También acepta: to, href, description
 */
export default function Card({ title, description, to, href, link, icon = '📄', children }) {
  const destination = to || href || link;
  const isExternal = destination && destination.startsWith('http');
  const desc = description || children;

  const content = (
    <div className={styles.card}>
      <div className={styles.cardIcon}>{icon}</div>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{title}</h3>
        {desc && <div className={styles.cardDescription}>{desc}</div>}
      </div>
      <div className={styles.cardArrow}>→</div>
    </div>
  );

  if (isExternal) {
    return (
      <a href={destination} target="_blank" rel="noopener noreferrer" className={styles.cardLink}>
        {content}
      </a>
    );
  }

  return (
    <Link to={destination} className={styles.cardLink}>
      {content}
    </Link>
  );
}
