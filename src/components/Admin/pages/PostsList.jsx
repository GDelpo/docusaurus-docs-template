/**
 * Posts list page — search, filters, paginated table with inline actions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, publishApi, categoriesApi, STATUS_LABELS, formatDate, flattenCategories } from '../api';
import { useAdminNavigate, useIsAdmin } from '../AdminApp';
import { Search, Plus, Check, Upload, Edit3, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PostsList() {
  const navigate = useAdminNavigate();
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [debouncedSearch, status, category]);

  // Read initial status from URL (e.g. /dashboard/posts?status=pending_review)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('status');
    if (s) setStatus(s);
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['posts', { page, status, category, search: debouncedSearch }],
    queryFn: () => postsApi.list({ page, status: status || undefined, category: category || undefined, search: debouncedSearch || undefined }),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const flatCats = categories ? flattenCategories(categories) : [];

  // Quick approve
  const approveMutation = useMutation({
    mutationFn: (id) => postsApi.review(id, 'approve'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['posts'] }); },
  });

  // Quick publish
  const publishMutation = useMutation({
    mutationFn: (id) => publishApi.one(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['posts'] }); },
  });

  const posts = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Filter bar */}
      <div className="adm-flex adm-gap-2 adm-mb-4" style={{ flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted)' }} />
          <input
            type="text"
            className="adm-input"
            placeholder="Buscar posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <select className="adm-select" style={{ width: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select className="adm-select" style={{ width: 200 }} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas las categorías</option>
          {flatCats.map((c) => (
            <option key={c.path} value={c.path}>{c.label}</option>
          ))}
        </select>
        <a href="/dashboard/editor" className="adm-btn adm-btn-primary">
          <Plus size={14} />
          Nuevo Post
        </a>
      </div>

      {/* Table */}
      <div className="adm-card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="adm-skeleton" style={{ height: 44 }} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="adm-empty">
            {debouncedSearch || status || category ? 'No se encontraron posts con estos filtros.' : 'No hay posts aún.'}
          </div>
        ) : (
          <>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Autor</th>
                  <th>Fecha</th>
                  <th style={{ width: 120 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <a href={`/dashboard/posts/${post.id}`} className="adm-table-link">
                        {post.title}
                      </a>
                      <div style={{ fontSize: 11, color: 'var(--adm-text-muted)', marginTop: 2 }}>
                        v{post.version} · {post.slug}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--adm-text-muted)' }}>
                      {post.categoryPath.split('/').pop()}
                    </td>
                    <td>
                      <span className={`adm-badge adm-badge-${post.status}`}>
                        {STATUS_LABELS[post.status] ?? post.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--adm-text-muted)', fontSize: 12 }}>
                      {post.authorDisplayName || post.author}
                    </td>
                    <td style={{ color: 'var(--adm-text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatDate(post.publishedAt || post.updatedAt)}
                    </td>
                    <td>
                      <div className="adm-flex adm-gap-2">
                        <a href={`/dashboard/posts/${post.id}`} className="adm-btn adm-btn-icon" title="Ver detalle">
                          <Eye size={14} />
                        </a>
                        {(post.status === 'draft' || post.status === 'rejected' || post.status === 'published') && (
                          <a href={`/dashboard/editor/${post.id}`} className="adm-btn adm-btn-icon" title={post.status === 'published' ? 'Editar (nueva versión)' : 'Editar'}>
                            <Edit3 size={14} />
                          </a>
                        )}
                        {post.status === 'pending_review' && isAdmin && (
                          <button
                            className="adm-btn adm-btn-icon"
                            title="Aprobar"
                            style={{ color: 'var(--adm-success)' }}
                            onClick={() => approveMutation.mutate(post.id)}
                            disabled={approveMutation.isPending}
                          >
                            <Check size={14} />
                          </button>
                        )}
                        {post.status === 'approved' && isAdmin && (
                          <button
                            className="adm-btn adm-btn-icon"
                            title="Publicar"
                            style={{ color: 'var(--adm-accent)' }}
                            onClick={() => publishMutation.mutate(post.id)}
                            disabled={publishMutation.isPending}
                          >
                            <Upload size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="adm-pagination" style={{ padding: '12px 16px' }}>
                <button className="adm-btn adm-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={14} /> Anterior
                </button>
                <span style={{ fontSize: 12, color: 'var(--adm-text-muted)' }}>
                  Página {page} de {totalPages} · {total} posts
                </span>
                <button className="adm-btn adm-btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Siguiente <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
