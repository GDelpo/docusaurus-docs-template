import React from 'react';
import styles from './styles.module.css';
import { enlacesExternos } from '@site/src/data/instructivos';
import AccesoRestringido from '../AccesoRestringido';

/**
 * Componente para renderizar enlaces externos con cards
 * 
 * Uso:
 * import EnlacesExternos from '@site/src/components/EnlacesExternos';
 * 
 * // Mostrar plataformas
 * <EnlacesExternos tipo="plataformas" />
 * 
 * // Mostrar herramientas internas
 * <EnlacesExternos tipo="internalTools" mostrarAcceso />
 */
export default function EnlacesExternos({ tipo, mostrarAcceso = false, titulo }) {
  const enlaces = enlacesExternos[tipo];
  
  if (!enlaces) {
    return <p>No se encontraron enlaces para: {tipo}</p>;
  }

  return (
    <div className={styles.container}>
      {titulo && <h3 className={styles.titulo}>{titulo}</h3>}
      <div className={styles.grid}>
        {enlaces.map((enlace, idx) => (
          <a 
            key={idx} 
            href={enlace.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.card}
          >
            <span className={styles.icon}>{enlace.icon}</span>
            <div className={styles.content}>
              <span className={styles.cardTitulo}>{enlace.titulo}</span>
              {enlace.descripcion && (
                <span className={styles.descripcion}>{enlace.descripcion}</span>
              )}
              {enlace.nota && (
                <span className={styles.nota}>💡 {enlace.nota}</span>
              )}
            </div>
            <span className={styles.external}>↗</span>
          </a>
        ))}
      </div>
      {mostrarAcceso && <AccesoRestringido />}
    </div>
  );
}
