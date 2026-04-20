import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';
import { instructivos } from '@site/src/data/instructivos';

/**
 * Componente para renderizar el índice de instructivos
 * 
 * Uso:
 * import IndiceInstructivos from '@site/src/components/IndiceInstructivos';
 * 
 * // Mostrar todo
 * <IndiceInstructivos />
 * 
 * // Mostrar solo algunas secciones
 * <IndiceInstructivos secciones={['getting-started', 'guides']} />
 * 
 * // Modo compacto (sin descripciones)
 * <IndiceInstructivos compact />
 */
export default function IndiceInstructivos({ secciones, compact = false }) {
  const seccionesAMostrar = secciones 
    ? Object.entries(instructivos).filter(([key]) => secciones.includes(key))
    : Object.entries(instructivos);

  return (
    <div className={styles.indice}>
      {seccionesAMostrar.map(([key, seccion]) => (
        <div key={key} className={styles.seccion}>
          <h2 className={styles.seccionTitulo}>
            <span className={styles.seccionIcon}>{seccion.icon}</span>
            {seccion.titulo}
          </h2>
          
          {Object.entries(seccion.categorias).map(([categoria, items]) => (
            <div key={categoria} className={styles.categoria}>
              <h3 className={styles.categoriaTitulo}>{categoria}</h3>
              <div className={compact ? styles.listaCompacta : styles.cardGrid}>
                {items.map((item, idx) => (
                  compact ? (
                    <Link key={idx} to={item.ruta} className={styles.linkCompacto}>
                      <span className={styles.itemIcon}>{item.icon}</span>
                      {item.titulo}
                    </Link>
                  ) : (
                    <Link key={idx} to={item.ruta} className={styles.card}>
                      <div className={styles.cardIcon}>{item.icon}</div>
                      <div className={styles.cardContent}>
                        <span className={styles.cardTitulo}>{item.titulo}</span>
                        {item.descripcion && (
                          <span className={styles.cardDescripcion}>{item.descripcion}</span>
                        )}
                      </div>
                      <span className={styles.cardArrow}>→</span>
                    </Link>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
