/**
 * CMS API client.
 *
 * Sends the docs_session cookie automatically (credentials: 'include').
 * All endpoints are under /admin/api/v1, routed to CMS backend via Traefik.
 */

const API_BASE = '/admin/api/v1';

// ---------------------------------------------------------------------------
// Generic fetch wrapper
// ---------------------------------------------------------------------------
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const headers = {
    ...options.headers,
  };

  // If body is not FormData, set JSON content type
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const resp = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // send docs_session cookie
  });

  if (resp.status === 401) {
    window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    throw new Error('No autenticado');
  }

  if (resp.status === 204) {
    return undefined;
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `Error ${resp.status}`);
  }

  return resp.json();
}

// ---------------------------------------------------------------------------
// Posts API
// ---------------------------------------------------------------------------
export const postsApi = {
  list: (params) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.page_size) qs.set('page_size', String(params.page_size));
    if (params?.status) qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    if (params?.author) qs.set('author', params.author);
    const query = qs.toString();
    return request(`/posts${query ? `?${query}` : ''}`);
  },

  get: (id) => request(`/posts/${id}`),

  create: (data) =>
    request('/posts', { method: 'POST', body: JSON.stringify(data) }),

  update: (id, data) =>
    request(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id) =>
    request(`/posts/${id}`, { method: 'DELETE' }),

  submit: (id) =>
    request(`/posts/${id}/submit`, { method: 'POST' }),

  review: (id, action, reason) =>
    request(`/posts/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, reason: reason || '' }),
    }),

  revisions: (id) => request(`/posts/${id}/revisions`),

  importDocx: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/import/docx', { method: 'POST', body: form });
  },
};

// ---------------------------------------------------------------------------
// Media API
// ---------------------------------------------------------------------------
export const mediaApi = {
  list: (contentType) => {
    const qs = contentType ? `?content_type=${contentType}` : '';
    return request(`/media${qs}`);
  },

  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/media/upload', { method: 'POST', body: form });
  },

  delete: (id) => request(`/media/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Publish API
// ---------------------------------------------------------------------------
export const publishApi = {
  one: (id) => request(`/publish/${id}`, { method: 'POST' }),
  all: () => request('/publish', { method: 'POST' }),
};

// ---------------------------------------------------------------------------
// Categories API
// ---------------------------------------------------------------------------
export const categoriesApi = {
  list: () => request('/publish/categories'),
};

// ---------------------------------------------------------------------------
// Assets API (per-post files)
// ---------------------------------------------------------------------------
export const assetsApi = {
  list: (postId) => request(`/posts/${postId}/assets`),

  upload: (postId, kind, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(`/posts/${postId}/assets/${kind}`, { method: 'POST', body: form });
  },

  delete: (postId, kind, filename) =>
    request(`/posts/${postId}/assets/${kind}/${filename}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// User API
// ---------------------------------------------------------------------------
export const userApi = {
  me: () => request('/me'),
};

// ---------------------------------------------------------------------------
// Existing Docs API
// ---------------------------------------------------------------------------
export const existingDocsApi = {
  list: () => request('/publish/existing-docs'),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const STATUS_LABELS = {
  draft: 'Borrador',
  pending_review: 'En revisión',
  approved: 'Aprobado',
  publishing: 'Publicando…',
  published: 'Publicado',
  rejected: 'Rechazado',
};

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  // Backend stores naive UTC — append Z so JS interprets as UTC
  const iso = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const iso = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function flattenCategories(nodes, prefix = '', depth = 0) {
  const result = [];
  for (const node of nodes) {
    const label = prefix ? `${prefix} / ${node.label}` : node.label;
    const indent = '\u00A0\u00A0'.repeat(depth);
    result.push({ label: `${indent}${depth ? '└ ' : ''}${node.label}`, fullLabel: label, path: node.path, depth });
    if (node.children?.length) {
      result.push(...flattenCategories(node.children, label, depth + 1));
    }
  }
  return result;
}
