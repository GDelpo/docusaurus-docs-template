import React from 'react';
import styles from './styles.module.css';

/**
 * Componente Video para incrustar videos de YouTube
 * 
 * Uso en MDX:
 * import Video from '@site/src/components/Video';
 * 
 * <Video 
 *   url="https://www.youtube.com/watch?v=VIDEO_ID"
 *   title="Título del video"
 * />
 * 
 * o con ID directo:
 * <Video id="VIDEO_ID" title="Título" />
 */
export default function Video({ url, id, title = 'Video' }) {
  let videoId = id;
  
  if (url && !id) {
    // Extraer ID de diferentes formatos de URL de YouTube
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    videoId = match ? match[1] : null;
  }

  if (!videoId) {
    return (
      <div className={styles.videoError}>
        ⚠️ URL de video no válida
      </div>
    );
  }

  return (
    <div className={styles.videoContainer}>
      <iframe
        className={styles.videoFrame}
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
