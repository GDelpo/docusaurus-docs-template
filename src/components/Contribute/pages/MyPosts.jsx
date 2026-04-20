/**
 * MyPosts — contributor's post list.
 *
 * Shows only the current user's posts with status, edit, and submit actions.
 * Simpler than the admin PostsList — no approve/publish columns.
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, categoriesApi, STATUS_LABELS, formatDate, flattenCategories } from '../../Admin/api';
import { useContributeUser } from '../ContributeApp';
import { Search, Plus, Send, Edit3, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_COLOR = {
  draft: { bg: '#f4f4f5', color: '#71717a' },
  pending_review: { bg: '#fef9c3', color: '#a16207' },
  approved: { bg: '#dcfce7', color: '#15803d' },
  publishing: { bg: '#e0e7ff', color: '#4338ca' },
  published: { bg: '#dbeafe', color: '#1d4ed8' },
  rejected: { bg: '#fee2e2', color: '#b91c1c' },
};

export default function MyPosts() {
  const user = useContributeUser();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, status]);

  const { data, isLoading } = useQuery({
    queryKey: ['my-posts', { page, status, search: debouncedSearch, author: user?.username }],
    queryFn: () => postsApi.list({
      page,
      status: status || undefined,
      search: debouncedSearch || undefined,
      author: user?.username,
    }),
    enabled: !!user,
  });

  // Submit for review
  const submitMutation = useMutation({
    mutationFn: (id) => postsApi.submit(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-posts'] }); },
  });

  const posts = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="ct-container">
      {/* Header */}
      <div className="ct-header">
        <div>
          <h1 className="ct-title">Mis Publicaciones</h1>
          <p className="ct-subtitle">Create and edit documentation</p>
        </div>
        <a href="/contribuir/editor" className="ct-btn ct-btn-primary">
          <Plus size={16} />
          Nuevo documento
        </a>
      </div>

      {/* Filters */}
      <div className="ct-filters">
        <div className="ct-search-wrap">
          <Search size={16} className="ct-search-icon" />
          <input
            type="text"
            className="ct-input"
            placeholder="Buscar mis posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
        <select className="ct-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Posts list */}
      {isLoading ? (
        <div className="ct-card">
          {[1, 2, 3].map(i => (
            <div key={i} className="ct-skeleton" style={{ height: 72, marginBottom: 8 }} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="ct-empty-state">
          <div className="ct-empty-icon">📝</div>
          <h3>No tenés publicaciones{status || debouncedSearch ? ' con estos filtros' : ' aún'}</h3>
          <p>Create your first document and contribute to the docs.</p>
          <a href="/contribuir/editor" className="ct-btn ct-btn-primary">
            <Plus size={16} />
            Crear mi primer documento
          </a>
        </div>
      ) : (
        <div className="ct-card ct-post-list">
          {posts.map(post => {
            const sc = STATUS_COLOR[post.status] || STATUS_COLOR.draft;
            return (
              <div key={post.id} className="ct-post-row">
                <div className="ct-post-info">
                  <a href={`/contribuir/post/${post.id}`} className="ct-post-title">
                    {post.title}
                  </a>
                  <div className="ct-post-meta">
                    <span className="ct-badge" style={{ background: sc.bg, color: sc.color }}>
                      {STATUS_LABELS[post.status] ?? post.status}
                    </span>
                    <span>v{post.version}</span>
                    <span>{formatDate(post.updatedAt)}</span>
                  </div>

                  {/* Show rejection reason */}
                  {post.status === 'rejected' && post.rejectionReason && (
                    <div className="ct-rejection">
                      ⚠️ {post.rejectionReason}
                    </div>
                  )}
                </div>

                <div className="ct-post-actions">
                  <a href={`/contribuir/post/${post.id}`} className="ct-btn ct-btn-sm" title="Ver">
                    <Eye size={14} />
                    Ver
                  </a>
                  {(post.status === 'draft' || post.status === 'rejected' || post.status === 'published') && (
                    <a href={`/contribuir/editor/${post.id}`} className="ct-btn ct-btn-sm" title="Editar">
                      <Edit3 size={14} />
                      Editar
                    </a>
                  )}
                  {post.status === 'draft' && (
                    <button
                      className="ct-btn ct-btn-sm ct-btn-accent"
                      onClick={() => submitMutation.mutate(post.id)}
                      disabled={submitMutation.isPending}
                      title="Enviar a revisión"
                    >
                      <Send size={14} />
                      Enviar
                    </button>
                  )}
                  {post.status === 'pending_review' && (
                    <span className="ct-waiting">En revisión...</span>
                  )}
                  {post.status === 'published' && (
                    <a
                      href={`/${post.categoryPath}/${post.slug}`}
                      className="ct-btn ct-btn-sm"
                      title="Ver en sitio"
                      target="_blank"
                      rel="noopener"
                    >
                      <Eye size={14} />
                      Sitio
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="ct-pagination">
          <button className="ct-btn ct-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={14} /> Anterior
          </button>
          <span className="ct-page-info">
            Página {page} de {totalPages}
          </span>
          <button className="ct-btn ct-btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Siguiente <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
