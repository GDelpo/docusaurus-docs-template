/**
 * Post detail page — preview content, review actions, revision history.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, publishApi, STATUS_LABELS, formatDate } from '../api';
import { useAdminNavigate, useIsAdmin } from '../AdminApp';
import {
  Edit3, Send, Check, X, MessageSquare, Upload, Trash2,
  ChevronDown, ChevronUp, ArrowLeft, Clock,
} from 'lucide-react';

/** Minimal markdown → HTML for content preview. */
function renderMarkdown(md) {
  return md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```[\s\S]*?```/g, (m) => `<pre>${m.slice(3, -3)}</pre>`)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

export default function PostDetail({ id }) {
  const navigate = useAdminNavigate();
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();
  const [showContent, setShowContent] = useState(true);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch post
  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.get(id),
  });

  // Fetch revisions
  const { data: revisions } = useQuery({
    queryKey: ['revisions', id],
    queryFn: () => postsApi.revisions(id),
  });

  // Mutations
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['post', id] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const submitMutation = useMutation({
    mutationFn: () => postsApi.submit(id),
    onSuccess: invalidate,
  });

  const approveMutation = useMutation({
    mutationFn: () => postsApi.review(id, 'approve'),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: (reason) => postsApi.review(id, 'reject', reason),
    onSuccess: () => { invalidate(); setRejectModal(false); setRejectReason(''); },
  });

  const requestChangesMutation = useMutation({
    mutationFn: (reason) => postsApi.review(id, 'request_changes', reason),
    onSuccess: () => { invalidate(); setRejectModal(false); setRejectReason(''); },
  });

  const publishMutation = useMutation({
    mutationFn: () => publishApi.one(id),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => postsApi.delete(id),
    onSuccess: () => { navigate('/dashboard/posts'); },
  });

  if (isLoading || !post) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="adm-skeleton" style={{ height: 120 }} />
        <div className="adm-skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <a href="/dashboard/posts" className="adm-flex adm-gap-2 adm-mb-4" style={{ color: 'var(--adm-text-muted)', textDecoration: 'none', fontSize: 13 }}>
        <ArrowLeft size={14} /> Volver a posts
      </a>

      <div className="adm-grid-2">
        {/* Left: Post info + content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header card */}
          <div className="adm-card">
            <div className="adm-flex adm-gap-3" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{post.title}</h2>
                <div style={{ fontSize: 12, color: 'var(--adm-text-muted)', marginTop: 4 }}>
                  {post.slug} · v{post.version}
                </div>
              </div>
              <span className={`adm-badge adm-badge-${post.status}`}>
                {STATUS_LABELS[post.status] ?? post.status}
              </span>
            </div>

            {post.description && (
              <p style={{ color: 'var(--adm-text-secondary)', fontSize: 13, margin: '0 0 12px' }}>
                {post.description}
              </p>
            )}

            <div className="adm-flex adm-gap-3" style={{ flexWrap: 'wrap', fontSize: 12, color: 'var(--adm-text-muted)' }}>
              <span>📂 {post.categoryPath}</span>
              {post.tags && <span>🏷️ {post.tags}</span>}
              <span>📝 Sidebar: {post.sidebarLabel || post.title}</span>
            </div>
          </div>

          {/* Content preview */}
          <div className="adm-card">
            <button
              className="adm-flex adm-gap-2"
              style={{ width: '100%', justifyContent: 'space-between', background: 'none', border: 'none', color: 'var(--adm-text-primary)', cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              onClick={() => setShowContent(prev => !prev)}
            >
              Contenido
              {showContent ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showContent && (
              <div
                className="adm-prose"
                style={{ marginTop: 16, maxHeight: 500, overflowY: 'auto' }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content || '*Sin contenido*') }}
              />
            )}
          </div>

          {/* Rejection reason */}
          {post.status === 'rejected' && post.rejectionReason && (
            <div className="adm-card" style={{ borderLeft: '3px solid var(--adm-error)' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--adm-error)' }}>Motivo del rechazo</h4>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--adm-text-secondary)' }}>{post.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Right: Actions + Info + Revisions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Actions */}
          <div className="adm-card">
            <h4 className="adm-card-title">Acciones</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Edit — available for draft/rejected/published */}
              {(post.status === 'draft' || post.status === 'rejected' || post.status === 'published') && (
                <a href={`/dashboard/editor/${post.id}`} className="adm-btn" style={{ justifyContent: 'center' }}>
                  <Edit3 size={14} /> {post.status === 'published' ? 'Editar (nueva versión)' : 'Editar en MDXEditor'}
                </a>
              )}

              {/* Submit for review — draft only */}
              {post.status === 'draft' && (
                <button
                  className="adm-btn adm-btn-warning"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  style={{ justifyContent: 'center' }}
                >
                  <Send size={14} /> Enviar a revisión
                </button>
              )}

              {/* Reviewer actions — pending_review (admin only) */}
              {post.status === 'pending_review' && isAdmin && (
                <>
                  <button
                    className="adm-btn adm-btn-success"
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                    style={{ justifyContent: 'center' }}
                  >
                    <Check size={14} /> Aprobar
                  </button>
                  <button
                    className="adm-btn adm-btn-danger"
                    onClick={() => { setRejectModal(true); setRejectReason(''); }}
                    style={{ justifyContent: 'center' }}
                  >
                    <X size={14} /> Rechazar
                  </button>
                  <button
                    className="adm-btn adm-btn-warning"
                    onClick={() => { setRejectModal(true); setRejectReason(''); }}
                    style={{ justifyContent: 'center' }}
                  >
                    <MessageSquare size={14} /> Solicitar cambios
                  </button>
                </>
              )}

              {/* Publish — approved (admin only) */}
              {post.status === 'approved' && isAdmin && (
                <button
                  className="adm-btn adm-btn-primary"
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                  style={{ justifyContent: 'center' }}
                >
                  <Upload size={14} /> {publishMutation.isPending ? 'Publicando...' : 'Publicar'}
                </button>
              )}

              {/* Delete — admin only (with confirmation) */}
              {isAdmin && (
                <button
                  className="adm-btn adm-btn-danger adm-btn-sm"
                  onClick={() => {
                    if (window.confirm(`¿Eliminar "${post.title}"? Esta acción no se puede deshacer.`)) {
                      deleteMutation.mutate();
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  style={{ justifyContent: 'center', marginTop: 8 }}
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="adm-card">
            <h4 className="adm-card-title">Información</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div className="adm-flex" style={{ justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--adm-text-muted)' }}>Autor</span>
                <span>{post.authorDisplayName || post.author}</span>
              </div>
              <div className="adm-flex" style={{ justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--adm-text-muted)' }}>Creado</span>
                <span>{formatDate(post.createdAt)}</span>
              </div>
              <div className="adm-flex" style={{ justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--adm-text-muted)' }}>Modificado</span>
                <span>{formatDate(post.updatedAt)}</span>
              </div>
              {post.reviewer && (
                <div className="adm-flex" style={{ justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--adm-text-muted)' }}>Revisor</span>
                  <span>{post.reviewerDisplayName || post.reviewer}</span>
                </div>
              )}
              {post.publishedAt && (
                <div className="adm-flex" style={{ justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--adm-text-muted)' }}>Publicado</span>
                  <span>{formatDate(post.publishedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Revisions */}
          {revisions && revisions.length > 0 && (
            <div className="adm-card">
              <h4 className="adm-card-title">Historial de revisiones</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {revisions.map((rev) => (
                  <div key={rev.id} className="adm-flex adm-gap-2" style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--adm-border-subtle)' }}>
                    <Clock size={12} style={{ color: 'var(--adm-text-muted)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div>
                        <strong>v{rev.version}</strong> — {rev.editedBy}
                      </div>
                      {rev.changeSummary && (
                        <div style={{ color: 'var(--adm-text-muted)', marginTop: 2 }}>{rev.changeSummary}</div>
                      )}
                      <div style={{ color: 'var(--adm-text-muted)', marginTop: 2 }}>{formatDate(rev.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject/Request changes modal */}
      {rejectModal && (
        <div className="adm-modal-overlay" onClick={() => setRejectModal(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Motivo</h3>
            <p style={{ fontSize: 13, color: 'var(--adm-text-secondary)', margin: '0 0 16px' }}>
              Indicá el motivo del rechazo o los cambios necesarios.
            </p>
            <textarea
              className="adm-textarea"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Escribí el motivo..."
              autoFocus
            />
            <div className="adm-flex adm-gap-2" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="adm-btn" onClick={() => setRejectModal(false)}>Cancelar</button>
              <button
                className="adm-btn adm-btn-warning"
                disabled={!rejectReason.trim() || requestChangesMutation.isPending}
                onClick={() => requestChangesMutation.mutate(rejectReason)}
              >
                Solicitar cambios
              </button>
              <button
                className="adm-btn adm-btn-danger"
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate(rejectReason)}
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
