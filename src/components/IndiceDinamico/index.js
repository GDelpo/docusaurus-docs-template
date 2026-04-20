import React from 'react';
import Link from '@docusaurus/Link';
import {useDocsSidebar} from '@docusaurus/plugin-content-docs/client';
import styles from './styles.module.css';

/**
 * Componente que genera un índice dinámico basado en el sidebar de Docusaurus
 * 
 * Se actualiza automáticamente cuando se agregan nuevos documentos.
 * 
 * Uso:
 * import IndiceDinamico from '@site/src/components/IndiceDinamico';
 * 
 * // Mostrar todo el sidebar
 * <IndiceDinamico />
 * 
 * // Filtrar por categorías específicas
 * <IndiceDinamico filtro={['Guides', 'Operations']} />
 * 
 * // Excluir categorías
 * <IndiceDinamico excluir={['Inicio']} />
 * 
 * // Modo compacto
 * <IndiceDinamico compact />
 * 
 * // Mostrar solo una categoría específica y sus hijos
 * <IndiceDinamico soloCategoria="Administración" />
 */

// Iconos por defecto para categorías conocidas
const iconosPorCategoria = {
  'Inicio': '🏠',
  'Administración': '🏢',
  'Sistemas': '💻',
  'Finance': '📋',
  'Comercial': '💼',
  'Marketing': '📣',
  'Engineering': '⚙️',
  'Operations': '📄',
  'Support': '✍️',
  'RRHH': '👥',
  'Autenticación': '🔐',
  'default': '📁',
};

// Obtener icono para una categoría
function getIcono(label) {
  return iconosPorCategoria[label] || iconosPorCategoria['default'];
}

// Renderizar un item del sidebar (puede ser doc o categoría)
function SidebarItem({ item, compact, depth = 0 }) {
  if (item.type === 'link') {
    // Es un documento
    return (
      <Link to={item.href} className={compact ? styles.linkCompacto : styles.docLink}>
        {!compact && <span className={styles.docIcon}>📄</span>}
        <span className={styles.docLabel}>{item.label}</span>
      </Link>
    );
  }
  
  if (item.type === 'category') {
    // Es una categoría con hijos
    return (
      <div className={styles.categoria}>
        <h3 className={depth === 0 ? styles.categoriaTitulo : styles.subcategoriaTitulo}>
          <span className={styles.categoriaIcon}>{getIcono(item.label)}</span>
          {item.label}
        </h3>
        <div className={compact ? styles.listaCompacta : styles.docsGrid}>
          {item.items?.map((subItem, idx) => (
            <SidebarItem key={idx} item={subItem} compact={compact} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }
  
  return null;
}

// Función para filtrar items del sidebar
function filtrarSidebar(items, filtro, excluir, soloCategoria) {
  if (soloCategoria) {
    // Buscar la categoría específica en todo el árbol
    for (const item of items) {
      if (item.type === 'category' && item.label === soloCategoria) {
        return [item];
      }
      if (item.type === 'category' && item.items) {
        const found = filtrarSidebar(item.items, null, null, soloCategoria);
        if (found.length > 0) return found;
      }
    }
    return [];
  }
  
  return items.filter(item => {
    if (item.type !== 'category') return false;
    if (filtro && !filtro.includes(item.label)) return false;
    if (excluir && excluir.includes(item.label)) return false;
    return true;
  });
}

export default function IndiceDinamico({ 
  filtro, 
  excluir = ['Inicio'], 
  compact = false,
  soloCategoria,
  mostrarTitulo = true,
}) {
  const sidebar = useDocsSidebar();
  
  if (!sidebar || !sidebar.items) {
    return <p>No se pudo cargar el índice.</p>;
  }

  const itemsFiltrados = filtrarSidebar(sidebar.items, filtro, excluir, soloCategoria);

  if (itemsFiltrados.length === 0) {
    return <p>No hay documentos que mostrar.</p>;
  }

  return (
    <div className={styles.indice}>
      {itemsFiltrados.map((item, idx) => (
        <div key={idx} className={styles.seccion}>
          {mostrarTitulo && item.type === 'category' && (
            <h2 className={styles.seccionTitulo}>
              <span className={styles.seccionIcon}>{getIcono(item.label)}</span>
              {item.label}
            </h2>
          )}
          <div className={compact ? styles.contenidoCompacto : styles.contenido}>
            {item.items?.map((subItem, subIdx) => (
              <SidebarItem key={subIdx} item={subItem} compact={compact} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
