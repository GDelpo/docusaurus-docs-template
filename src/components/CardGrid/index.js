import React from 'react';
import styles from '../Card/styles.module.css';

/**
 * Componente CardGrid para mostrar tarjetas en grilla
 * 
 * Uso en MDX:
 * import CardGrid from '@site/src/components/CardGrid';
 * import Card from '@site/src/components/Card';
 * 
 * <CardGrid>
 *   <Card title="Doc 1" to="/doc1" />
 *   <Card title="Doc 2" to="/doc2" />
 * </CardGrid>
 */
export default function CardGrid({ children, cols = 2 }) {
  const style = {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
  };

  return (
    <div className={styles.cardGrid} style={cols !== 2 ? style : undefined}>
      {children}
    </div>
  );
}
