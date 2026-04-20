/**
 * ContributeDetail — Post preview page for contributors.
 *
 * Shows the post rendered (almost like prod) with metadata and actions.
 * Clean layout: back + header bar, then content, then footer info.
 */
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, STATUS_LABELS, formatDate } from '../../Admin/api';
import { useContributeNavigate, useContributeUser } from '../ContributeApp';
import MarkdownPreview from '../MarkdownPreview';
import { ArrowLeft, Edit3, Send, Eye, Clock, User, Folder } from 'lucide-react';

const STATUS_COLOR = {
  draft: { bg: '#f4f4f5', color: '#71717a' },
  pending_review: { bg: '#fef9c3', color: '#a16207' },
  approved: { bg: '#dcfce7', color: '#15803d' },
  publishing: { bg: '#e0e7ff', color: '#4338ca' },
  published: { bg: '#dbeafe', color: '#1d4ed8' },
  rejected: { bg: '#fee2e2', color: '#b91c1c' },
};

export default function ContributeDetail({ id }) {
  const navigate = useContributeNavigate();
  const user = useContributeUser();
  const queryClient = useQueryClient();

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.get(id),
  });

  const submitMutation = useMutation({
    mutationFn: () => postsApi.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
    },
  });

  if (isLoading || !post) {
    return (
      <div className="ct-container">
        <div className="ct-skeleton" style={{ height: 120 }} />
        <div className="ct-skeleton" style={{ height: 400, marginTop: 16 }} />
      </div>
    );
  }

  const sc = STATUS_COLOR[post.status] || STATUS_COLOR.draft;
  const canEdit = post.status === 'draft' || post.status === 'rejected' || post.status === 'published';
  const canSubmit = post.status === 'draft';

  return (
    <div className="ct-container">
      {/* Top bar: back + actions */}
      <div className="ct-detail-topbar">
        <a href="/contribuir" className="ct-btn ct-btn-sm">
          <ArrowLeft size={14} /> Volver
        </a>
        <div className="ct-detail-actions">
          {canEdit && (
            <a href={`/contribuir/editor/${post.id}`} className="ct-btn ct-btn-primary ct-btn-sm">
              <Edit3 size={14} /> Editar
            </a>
          )}
          {canSubmit && (
            <button
              className="ct-btn ct-btn-accent ct-btn-sm"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
            >
              <Send size={14} /> Enviar a revisión
            </button>
          )}
          {post.status === 'published' && (
            <a
              href={`/${post.categoryPath}/${post.slug}`}
              className="ct-btn ct-btn-sm"
              target="_blank"
              rel="noopener"
            >
              <Eye size={14} /> Ver en sitio
            </a>
          )}
        </div>
      </div>

      {/* Header: title + meta */}
      <div className="ct-detail-header">
        <h1 className="ct-detail-title">{post.title}</h1>
        <div className="ct-detail-meta">
          <span className="ct-badge" style={{ background: sc.bg, color: sc.color }}>
            {STATUS_LABELS[post.status] ?? post.status}
          </span>
          <span className="ct-detail-meta-item"><Folder size={12} /> {post.categoryPath}</span>
          <span className="ct-detail-meta-item"><User size={12} /> {post.authorDisplayName || post.author}</span>
          <span className="ct-detail-meta-item"><Clock size={12} /> {formatDate(post.updatedAt)}</span>
          <span className="ct-detail-meta-item">v{post.version}</span>
        </div>
      </div>

      {/* Rejection reason */}
      {post.status === 'rejected' && post.rejectionReason && (
        <div className="ct-detail-rejection">
          ⚠️ <strong>Motivo del rechazo:</strong> {post.rejectionReason}
        </div>
      )}

      {/* Content preview */}
      <div className="ct-card ct-detail-content">
        <MarkdownPreview content={post.content} />
      </div>
    </div>
  );
}
