/**
 * Post editor page — MDXEditor + metadata sidebar.
 * Creates new posts or edits existing ones.
 */
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, categoriesApi, assetsApi, slugify, flattenCategories, formatBytes } from '../api';
import { useAdminNavigate } from '../AdminApp';
import { Save, Send, ArrowLeft, Image, FileDown, Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react';

// Lazy-load MDXEditor (heavy dependency)
const MdxEditor = React.lazy(() => import('../MdxEditor'));

export default function PostEditor({ id }) {
  const isNew = !id;
  const navigate = useAdminNavigate();
  const queryClient = useQueryClient();
  const editorRef = useRef(null);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sidebarLabel, setSidebarLabel] = useState('');
  const [sidebarPosition, setSidebarPosition] = useState(0);
  const [tags, setTags] = useState('');
  const [categoryPath, setCategoryPath] = useState('');
  const [content, setContent] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);

  // Load existing post
  const { data: post } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.get(id),
    enabled: !isNew,
  });

  // Load categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const flatCats = categories ? flattenCategories(categories) : [];

  // Populate form with existing post
  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setSlug(post.slug);
      setDescription(post.description);
      setSidebarLabel(post.sidebarLabel);
      setSidebarPosition(post.sidebarPosition);
      setTags(post.tags);
      setCategoryPath(post.categoryPath);
      setContent(post.content);
      setAutoSlug(false);
    }
  }, [post]);

  // Auto-slug from title
  useEffect(() => {
    if (autoSlug && isNew) {
      setSlug(slugify(title));
    }
  }, [title, autoSlug, isNew]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => postsApi.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigate(`/dashboard/editor/${created.id}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data) => postsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
  });

  // Submit for review
  const submitMutation = useMutation({
    mutationFn: () => postsApi.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
  });

  const handleSave = async () => {
    const editorContent = editorRef.current?.getMarkdown() || content;

    if (isNew) {
      await createMutation.mutateAsync({
        title,
        slug,
        description,
        content: editorContent,
        sidebarLabel: sidebarLabel || title,
        sidebarPosition,
        tags,
        categoryPath,
      });
    } else {
      await updateMutation.mutateAsync({
        title,
        description,
        content: editorContent,
        sidebarLabel: sidebarLabel || title,
        sidebarPosition,
        tags,
        categoryPath,
        changeSummary: '',
      });
    }
  };

  // Derive saving state from mutations (rerender-derived-state)
  const saving = createMutation.isPending || updateMutation.isPending;

  const canSubmit = !isNew && post?.status === 'draft';
  const canEdit = isNew || post?.status === 'draft' || post?.status === 'rejected' || post?.status === 'published';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', margin: '-24px', overflow: 'hidden' }}>
      {/* Top bar */}
      <div className="adm-flex" style={{ justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid var(--adm-border-subtle)', background: 'var(--adm-surface-1)' }}>
        <div className="adm-flex adm-gap-3">
          <a href="/dashboard/posts" className="adm-btn adm-btn-icon" title="Volver">
            <ArrowLeft size={16} />
          </a>
          <span style={{ fontSize: 13, color: 'var(--adm-text-muted)' }}>
            {isNew ? 'Nuevo post' : `Editando: ${post?.title || '...'}`}
          </span>
          {post && (
            <span className={`adm-badge adm-badge-${post.status}`} style={{ marginLeft: 4 }}>
              v{post.version}
            </span>
          )}
        </div>

        <div className="adm-flex adm-gap-2">
          {canSubmit && (
            <button
              className="adm-btn adm-btn-warning adm-btn-sm"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
            >
              <Send size={14} />
              Enviar a revisión
            </button>
          )}
          {canEdit && (
            <button
              className="adm-btn adm-btn-primary adm-btn-sm"
              onClick={handleSave}
              disabled={saving || !title || !slug || !categoryPath}
            >
              <Save size={14} />
              {saving ? 'Guardando...' : isNew ? 'Crear borrador' : 'Guardar cambios'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Editor area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {/* Title input */}
            <input
              type="text"
              placeholder="Título del post..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEdit}
              style={{
                width: '100%',
                fontSize: 22,
                fontWeight: 600,
                background: 'transparent',
                border: 'none',
                color: 'var(--adm-text-primary)',
                outline: 'none',
                padding: 0,
                marginBottom: 8,
                fontFamily: 'inherit',
              }}
            />
            <p style={{ fontSize: 12, color: 'var(--adm-text-muted)', marginBottom: 20 }}>
              Slug: <code style={{ color: 'var(--adm-text-secondary)', background: 'var(--adm-surface-2)', padding: '2px 6px', borderRadius: 4 }}>{slug || '...'}</code>
              {isNew && (
                <button
                  onClick={() => setAutoSlug(!autoSlug)}
                  style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--adm-accent)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                >
                  {autoSlug ? 'editar manualmente' : 'auto-generar'}
                </button>
              )}
            </p>

            {/* MDXEditor */}
            <Suspense fallback={<div className="adm-skeleton" style={{ height: 400 }} />}>
              {(isNew || post) ? (
                <MdxEditor
                  key={id ?? 'new'}
                  ref={editorRef}
                  markdown={content}
                  onChange={setContent}
                  readOnly={!canEdit}
                />
              ) : (
                <div className="adm-skeleton" style={{ height: 400 }} />
              )}
            </Suspense>

            {/* Rejection reason */}
            {post?.status === 'rejected' && post.rejectionReason && (
              <div className="adm-card" style={{ marginTop: 16, borderLeft: '3px solid var(--adm-error)' }}>
                <strong style={{ color: 'var(--adm-error)', fontSize: 13 }}>Motivo del rechazo:</strong>
                <span style={{ color: 'var(--adm-text-secondary)', fontSize: 13, marginLeft: 8 }}>
                  {post.rejectionReason}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Metadata sidebar */}
        <aside style={{
          width: 280,
          flexShrink: 0,
          borderLeft: '1px solid var(--adm-border-subtle)',
          overflowY: 'auto',
          background: 'var(--adm-surface-1)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--adm-text-muted)', margin: 0 }}>
            Metadata
          </h3>

          {/* Category */}
          <div>
            <label className="adm-label">Categoría *</label>
            <select
              className="adm-select"
              value={categoryPath}
              onChange={(e) => setCategoryPath(e.target.value)}
              disabled={!canEdit}
            >
              <option value="">Seleccionar categoría...</option>
              {flatCats.map((c) => (
                <option key={c.path} value={c.path}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Slug (manual edit) */}
          {!autoSlug && (
            <div>
              <label className="adm-label">Slug</label>
              <input
                className="adm-input"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={!isNew}
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="adm-label">Descripción</label>
            <textarea
              className="adm-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit}
              rows={3}
              placeholder="Breve descripción del contenido..."
            />
          </div>

          {/* Sidebar label */}
          <div>
            <label className="adm-label">Label del sidebar</label>
            <input
              className="adm-input"
              type="text"
              value={sidebarLabel}
              onChange={(e) => setSidebarLabel(e.target.value)}
              disabled={!canEdit}
              placeholder={title || 'Igual al título'}
            />
          </div>

          {/* Sidebar position */}
          <div>
            <label className="adm-label">Posición</label>
            <input
              className="adm-input"
              type="number"
              value={sidebarPosition}
              onChange={(e) => setSidebarPosition(Number(e.target.value))}
              disabled={!canEdit}
              min={0}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="adm-label">Tags (separados por coma)</label>
            <input
              className="adm-input"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={!canEdit}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          {/* Post assets — only for saved posts */}
          {!isNew && <PostAssets postId={id} canEdit={canEdit} editorRef={editorRef} />}

          {/* Post info */}
          {post && (
            <div style={{ paddingTop: 12, borderTop: '1px solid var(--adm-border-subtle)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--adm-text-muted)' }}>
              <div>Autor: <span style={{ color: 'var(--adm-text-secondary)' }}>{post.authorDisplayName || post.author}</span></div>
              <div>Creado: <span style={{ color: 'var(--adm-text-secondary)' }}>{new Date(post.createdAt).toLocaleString('es-AR')}</span></div>
              <div>Modificado: <span style={{ color: 'var(--adm-text-secondary)' }}>{new Date(post.updatedAt).toLocaleString('es-AR')}</span></div>
              {post.reviewer && (
                <div>Revisor: <span style={{ color: 'var(--adm-text-secondary)' }}>{post.reviewerDisplayName || post.reviewer}</span></div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// PostAssets — collapsible sidebar section for per-post files
// ---------------------------------------------------------------------------
function PostAssets({ postId, canEdit, editorRef }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);
  const [uploading, setUploading] = useState(false);
  const imgInputRef = useRef(null);
  const dlInputRef = useRef(null);

  const { data: assets } = useQuery({
    queryKey: ['assets', postId],
    queryFn: () => assetsApi.list(postId),
    enabled: !!postId,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ kind, file }) => assetsApi.upload(postId, kind, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', postId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ kind, filename }) => assetsApi.delete(postId, kind, filename),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', postId] });
    },
  });

  const handleUpload = async (kind, files) => {
    setUploading(true);
    for (const file of files) {
      try {
        await uploadMutation.mutateAsync({ kind, file });
      } catch {
        // individual file error — continue with others
      }
    }
    setUploading(false);
  };

  const copyRef = (ref) => {
    navigator.clipboard.writeText(ref).catch(() => {});
  };

  const insertInEditor = (ref) => {
    if (editorRef.current?.insertMarkdown) {
      editorRef.current.insertMarkdown(ref);
    } else {
      copyRef(ref);
    }
  };

  const images = assets?.images ?? [];
  const downloads = assets?.downloads ?? [];

  return (
    <div style={{ paddingTop: 12, borderTop: '1px solid var(--adm-border-subtle)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.05em', color: 'var(--adm-text-muted)',
        }}
      >
        Archivos del Post
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Images section */}
          <div>
            <div className="adm-flex" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--adm-text-secondary)' }}>
                <Image size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Imágenes ({images.length})
              </span>
              {canEdit && (
                <button
                  className="adm-btn adm-btn-sm"
                  style={{ fontSize: 11, padding: '2px 8px' }}
                  onClick={() => imgInputRef.current?.click()}
                  disabled={uploading}
                >
                  + Subir
                </button>
              )}
            </div>
            <input
              ref={imgInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files.length) {
                  handleUpload('images', Array.from(e.target.files));
                  e.target.value = '';
                }
              }}
            />
            {images.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {images.map((f) => (
                  <AssetItem
                    key={f.filename}
                    file={f}
                    onCopy={() => copyRef(f.markdownRef)}
                    onInsert={() => insertInEditor(f.markdownRef)}
                    onDelete={() => deleteMutation.mutate({ kind: 'images', filename: f.filename })}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Downloads section */}
          <div>
            <div className="adm-flex" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--adm-text-secondary)' }}>
                <FileDown size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Descargas ({downloads.length})
              </span>
              {canEdit && (
                <button
                  className="adm-btn adm-btn-sm"
                  style={{ fontSize: 11, padding: '2px 8px' }}
                  onClick={() => dlInputRef.current?.click()}
                  disabled={uploading}
                >
                  + Subir
                </button>
              )}
            </div>
            <input
              ref={dlInputRef}
              type="file"
              accept=".pdf,.zip,.xlsx,.xls,.docx,.csv,.txt"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files.length) {
                  handleUpload('downloads', Array.from(e.target.files));
                  e.target.value = '';
                }
              }}
            />
            {downloads.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {downloads.map((f) => (
                  <AssetItem
                    key={f.filename}
                    file={f}
                    onCopy={() => copyRef(f.markdownRef)}
                    onInsert={() => insertInEditor(f.markdownRef)}
                    onDelete={() => deleteMutation.mutate({ kind: 'downloads', filename: f.filename })}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            )}
          </div>

          {uploading && (
            <div style={{ fontSize: 11, color: 'var(--adm-accent)', textAlign: 'center' }}>
              Subiendo archivos...
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function AssetItem({ file, onCopy, onInsert, onDelete, canEdit }) {
  return (
    <div
      className="adm-flex"
      style={{
        justifyContent: 'space-between',
        padding: '4px 6px',
        borderRadius: 4,
        background: 'var(--adm-surface-2)',
        fontSize: 11,
      }}
    >
      <span
        style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', color: 'var(--adm-text-secondary)' }}
        title={`${file.filename} (${formatBytes(file.size)})\nClick para insertar en editor`}
        onClick={onInsert}
      >
        {file.filename}
      </span>
      <div className="adm-flex adm-gap-1" style={{ flexShrink: 0 }}>
        <button
          onClick={onCopy}
          title="Copiar referencia Markdown"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)', padding: 2 }}
        >
          <Copy size={10} />
        </button>
        {canEdit && (
          <button
            onClick={onDelete}
            title="Eliminar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-error)', padding: 2 }}
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}
