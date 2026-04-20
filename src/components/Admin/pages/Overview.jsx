/**
 * Overview page — stats, quick actions, recent posts.
 */
import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { postsApi, publishApi, STATUS_LABELS, formatDate } from '../api';
import { useAdminNavigate, useIsAdmin } from '../AdminApp';
import { Plus, ClipboardCheck, Upload, RefreshCw } from 'lucide-react';

export default function Overview() {
  const navigate = useAdminNavigate();
  const isAdmin = useIsAdmin();

  // Fetch recent posts (all statuses, sorted by updated_at)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['posts', 'all'],
    queryFn: () => postsApi.list({ page: 1, page_size: 10 }),
  });

  // Fetch per-status counts in parallel
  const drafts = useQuery({ queryKey: ['posts', 'draft'], queryFn: () => postsApi.list({ status: 'draft' }) });
  const pending = useQuery({ queryKey: ['posts', 'pending'], queryFn: () => postsApi.list({ status: 'pending_review' }) });
  const approved = useQuery({ queryKey: ['posts', 'approved'], queryFn: () => postsApi.list({ status: 'approved' }) });
  const published = useQuery({ queryKey: ['posts', 'published'], queryFn: () => postsApi.list({ status: 'published' }) });

  // Publish all approved
  const publishAll = useMutation({
    mutationFn: () => publishApi.all(),
    onSuccess: () => {
      refetch();
      approved.refetch();
      published.refetch();
    },
  });

  const stats = [
    { label: 'Total', value: data?.total ?? '—', color: 'var(--adm-text-primary)' },
    { label: 'Borradores', value: drafts.data?.total ?? '—', color: 'var(--adm-text-muted)' },
    { label: 'En revisión', value: pending.data?.total ?? '—', color: 'var(--adm-warning)' },
    { label: 'Aprobados', value: approved.data?.total ?? '—', color: 'var(--adm-success)' },
    { label: 'Publicados', value: published.data?.total ?? '—', color: 'var(--adm-accent)' },
  ];

  const recentPosts = data?.items?.slice(0, 8) ?? [];

  return (
    <div>
      {/* Stats grid */}
      <div className="adm-stat-grid">
        {stats.map((s) => (
          <div className="adm-stat-card" key={s.label}>
            <div className="adm-stat-value" style={{ color: s.color }}>
              {isLoading ? <div className="adm-skeleton" style={{ width: 40, height: 28 }} /> : s.value}
            </div>
            <div className="adm-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <a href="/dashboard/editor" className="adm-card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <Plus size={20} style={{ color: 'var(--adm-accent)' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--adm-text-primary)' }}>Crear Post</div>
            <div style={{ fontSize: 12, color: 'var(--adm-text-muted)' }}>Abrir el editor MDX</div>
          </div>
        </a>

        {isAdmin && (
          <a href="/dashboard/posts?status=pending_review" className="adm-card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <ClipboardCheck size={20} style={{ color: 'var(--adm-warning)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--adm-text-primary)' }}>Revisar Pendientes</div>
              <div style={{ fontSize: 12, color: 'var(--adm-text-muted)' }}>{pending.data?.total ?? 0} esperando</div>
            </div>
          </a>
        )}

        {isAdmin && (
          <button
            className="adm-card"
            onClick={() => publishAll.mutate()}
            disabled={publishAll.isPending || (approved.data?.total ?? 0) === 0}
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: '1px solid var(--adm-border-subtle)' }}
          >
            <Upload size={20} style={{ color: 'var(--adm-success)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--adm-text-primary)' }}>
                {publishAll.isPending ? 'Publicando...' : 'Publicar Aprobados'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--adm-text-muted)' }}>{approved.data?.total ?? 0} listos</div>
            </div>
          </button>
        )}
      </div>

      {/* Recent posts */}
      <div className="adm-card">
        <div className="adm-flex adm-gap-2" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 className="adm-card-title" style={{ margin: 0 }}>Posts Recientes</h3>
          <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => refetch()}>
            <RefreshCw size={14} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map((i) => <div key={i} className="adm-skeleton" style={{ height: 40 }} />)}
          </div>
        ) : recentPosts.length === 0 ? (
          <div className="adm-empty">No hay posts aún. ¡Creá el primero!</div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Estado</th>
                <th>Autor</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {recentPosts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <a href={`/dashboard/posts/${post.id}`} className="adm-table-link">
                      {post.title}
                    </a>
                  </td>
                  <td>
                    <span className={`adm-badge adm-badge-${post.status}`}>
                      {STATUS_LABELS[post.status] ?? post.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--adm-text-muted)' }}>{post.authorDisplayName || post.author}</td>
                  <td style={{ color: 'var(--adm-text-muted)', fontSize: 12 }}>{formatDate(post.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
