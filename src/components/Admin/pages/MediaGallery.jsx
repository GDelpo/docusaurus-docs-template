/**
 * Media gallery page — upload, browse, copy URL, delete.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaApi, formatBytes } from '../api';
import { UploadCloud, Copy, Trash2, FileText, File, Image } from 'lucide-react';

const FILTERS = [
  { label: 'Todos', value: '' },
  { label: 'Imágenes', value: 'image' },
  { label: 'PDFs', value: 'application/pdf' },
  { label: 'Documentos', value: 'text' },
];

export default function MediaGallery() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();

  // Cleanup toast timer on unmount
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['media', filter],
    queryFn: () => mediaApi.list(filter || undefined),
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => mediaApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => mediaApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      showToast('Archivo eliminado', 'success');
    },
  });

  const showToast = useCallback((message, type) => {
    setToast({ message, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    let successCount = 0;
    for (const file of Array.from(files)) {
      try {
        await uploadMutation.mutateAsync(file);
        successCount++;
      } catch (err) {
        showToast(`Error subiendo ${file.name}: ${err.message}`, 'error');
      }
    }
    if (successCount > 0) {
      showToast(`${successCount} archivo(s) subido(s)`, 'success');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const copyUrl = (url) => {
    const fullUrl = window.location.origin + url;
    navigator.clipboard.writeText(fullUrl).then(() => showToast('URL copiada', 'success'));
  };

  const handleDelete = (item) => {
    if (window.confirm(`¿Eliminar "${item.originalName}"?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const items = data?.items ?? [];

  return (
    <div>
      {/* Upload zone */}
      <div
        className={`adm-dropzone ${dragActive ? 'active' : ''}`}
        style={{ marginBottom: 20 }}
        onClick={() => document.getElementById('file-input')?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <UploadCloud size={36} style={{ color: 'var(--adm-text-muted)', marginBottom: 8 }} />
        <p style={{ color: 'var(--adm-text-secondary)', fontSize: 13 }}>
          Arrastrá archivos aquí o <span style={{ color: 'var(--adm-accent)' }}>buscá en tu equipo</span>
        </p>
        <p style={{ color: 'var(--adm-text-muted)', fontSize: 12 }}>Imágenes, PDFs, documentos. Máximo 20 MB.</p>
        {uploadMutation.isPending && (
          <p style={{ color: 'var(--adm-warning)', fontSize: 12, marginTop: 8 }}>Subiendo...</p>
        )}
        <input
          type="file"
          id="file-input"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Filter bar */}
      <div className="adm-flex adm-gap-2 adm-mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`adm-btn adm-btn-sm ${filter === f.value ? 'adm-btn-primary' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--adm-text-muted)' }}>
          {items.length} archivo{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Media grid */}
      {isLoading ? (
        <div className="adm-media-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="adm-skeleton" style={{ aspectRatio: '1', borderRadius: 'var(--adm-radius)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="adm-empty">
          <Image size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>No hay archivos subidos</p>
        </div>
      ) : (
        <div className="adm-media-grid">
          {items.map((item) => {
            const isImage = item.contentType.startsWith('image/');
            return (
              <div key={item.id} className="adm-media-card">
                {isImage ? (
                  <img src={item.url} alt={item.originalName} className="adm-media-thumb" loading="lazy" />
                ) : (
                  <div className="adm-media-placeholder">
                    {item.contentType.includes('pdf') ? <FileText size={32} /> : <File size={32} />}
                  </div>
                )}
                <div className="adm-media-info">
                  <div className="adm-truncate" style={{ fontSize: 12, fontWeight: 500, color: 'var(--adm-text-primary)' }} title={item.originalName}>
                    {item.originalName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--adm-text-muted)', marginTop: 2 }}>
                    {formatBytes(item.size)}{item.width && item.height ? ` · ${item.width}×${item.height}` : ''}
                  </div>
                </div>
                <div className="adm-media-overlay">
                  <button
                    className="adm-btn adm-btn-sm"
                    style={{ background: 'var(--adm-surface-2)' }}
                    onClick={() => copyUrl(item.url)}
                    title="Copiar URL"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    className="adm-btn adm-btn-sm adm-btn-danger"
                    onClick={() => handleDelete(item)}
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`adm-toast adm-toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
