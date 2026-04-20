/**
 * ContributeEditor — Wiki-like post editor for contributors.
 *
 * Minimalist UX for non-technical users:
 * - Only 3 decisions: title, area, and content
 * - Description & tags handled by admin at review time
 * - Auto-save after first manual save (drafts only)
 * - Validation before save and submit
 * - Slug, sidebarLabel auto-generated from title
 */
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, categoriesApi, slugify, flattenCategories } from '../../Admin/api';
import { useContributeNavigate } from '../ContributeApp';
import { Save, Send, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

const ContributeMdxEditor = React.lazy(() => import('../ContributeMdxEditor'));

const AUTOSAVE_DELAY = 10_000; // 10 s of inactivity

export default function ContributeEditor({ id }) {
  const isNew = !id;
  const navigate = useContributeNavigate();
  const queryClient = useQueryClient();
  const editorRef = useRef(null);

  /* ---- state (only what the contributor needs) ---- */
  const [title, setTitle] = useState('');
  const [categoryPath, setCategoryPath] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState({});
  const [autoSaveStatus, setAutoSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [importStatus, setImportStatus] = useState(null); // null | 'loading' | 'error'
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  const autoSaveTimer = useRef(null);
  const isDirty = useRef(false);

  /* ---- queries ---- */
  const { data: post } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.get(id),
    enabled: !isNew,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const flatCats = categories ? flattenCategories(categories) : [];

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setCategoryPath(post.categoryPath);
      setContent(post.content);
    }
  }, [post]);

  /* ---- mutations ---- */
  const createMutation = useMutation({
    mutationFn: (data) => postsApi.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      navigate(`/contribuir/editor/${created.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => postsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      isDirty.current = false;
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => postsApi.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
  });

  /* ---- validation ---- */
  const validate = (forSubmit = false) => {
    const e = {};
    if (!title || title.trim().length < 3) e.title = 'El título debe tener al menos 3 caracteres';
    if (!categoryPath) e.categoryPath = 'Seleccioná un área';
    if (forSubmit) {
      const md = editorRef.current?.getMarkdown() || content;
      if (!md || md.trim().length < 10) e.content = 'El contenido es muy corto para enviar a revisión';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ---- manual save ---- */
  const handleSave = async () => {
    if (!validate()) return;
    const editorContent = editorRef.current?.getMarkdown() || content;

    if (isNew) {
      await createMutation.mutateAsync({
        title, slug: slugify(title),
        description: '', content: editorContent,
        sidebarLabel: title, sidebarPosition: 0,
        tags: '', categoryPath,
      });
    } else {
      await updateMutation.mutateAsync({
        title, content: editorContent,
        sidebarLabel: title,
        sidebarPosition: post?.sidebarPosition ?? 0,
        categoryPath, changeSummary: '',
      });
    }
  };

  /* ---- submit for review ---- */
  const handleSubmit = () => {
    if (!validate(true)) return;
    // Cancel any pending auto-save — post is leaving draft status
    clearTimeout(autoSaveTimer.current);
    isDirty.current = false;
    submitMutation.mutate();
  };

  /* ---- docx import ---- */
  const handleImportDocx = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
    setImportStatus('loading');
    setImportError('');
    try {
      const result = await postsApi.importDocx(file);
      setContent(result.content);
      if (editorRef.current?.setMarkdown) {
        editorRef.current.setMarkdown(result.content);
      }
      setImportStatus(null);
    } catch (err) {
      setImportStatus('error');
      setImportError(err.message || 'Error al importar el archivo');
    }
  };

  /* ---- auto-save (only for drafts — stops after submit/review) ---- */
  const autoSaveFn = useRef(null);
  autoSaveFn.current = async () => {
    // Only auto-save drafts; never auto-save pending_review/approved/published
    if (post?.status && post.status !== 'draft') return;
    if (!title || title.trim().length < 3 || !categoryPath) return;
    const editorContent = editorRef.current?.getMarkdown() || content;
    setAutoSaveStatus('saving');
    try {
      await updateMutation.mutateAsync({
        title, content: editorContent,
        sidebarLabel: title,
        sidebarPosition: post?.sidebarPosition ?? 0,
        categoryPath, changeSummary: '',
      });
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus(null), 3000);
    } catch {
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus(null), 5000);
    }
  };

  const scheduleAutoSave = useCallback(() => {
    if (isNew) return;
    isDirty.current = true;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (isDirty.current) autoSaveFn.current?.();
    }, AUTOSAVE_DELAY);
  }, [isNew]);

  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  /* ---- change handlers ---- */
  const onTitleChange = (e) => {
    setTitle(e.target.value);
    setErrors((prev) => ({ ...prev, title: undefined }));
    scheduleAutoSave();
  };

  const onCategoryChange = (e) => {
    setCategoryPath(e.target.value);
    setErrors((prev) => ({ ...prev, categoryPath: undefined }));
    scheduleAutoSave();
  };

  const onContentChange = (val) => {
    setContent(val);
    setErrors((prev) => ({ ...prev, content: undefined }));
    scheduleAutoSave();
  };

  /* ---- derived ---- */
  const saving = createMutation.isPending || updateMutation.isPending;
  const canSubmit = !isNew && post?.status === 'draft';
  const canEdit = isNew || post?.status === 'draft' || post?.status === 'rejected' || post?.status === 'published';

  return (
    <div className="ct-editor">
      {/* Top bar */}
      <div className="ct-editor-topbar">
        <div className="ct-editor-topbar-left">
          <a href="/contribuir" className="ct-btn ct-btn-sm" title="Volver">
            <ArrowLeft size={16} />
          </a>
          <span className="ct-editor-title-hint">
            {isNew ? 'Nuevo documento' : `Editando: ${post?.title || '...'}`}
          </span>
          {post && (
            <span className="ct-badge ct-badge-inline" style={{
              background: post.status === 'draft' ? '#f4f4f5' : post.status === 'pending_review' ? '#fef9c3' : post.status === 'published' ? '#dbeafe' : '#fee2e2',
              color: post.status === 'draft' ? '#71717a' : post.status === 'pending_review' ? '#a16207' : post.status === 'published' ? '#1d4ed8' : '#b91c1c',
            }}>
              v{post.version}
            </span>
          )}
          {autoSaveStatus === 'saving' && (
            <span className="ct-autosave ct-autosave-saving">Guardando...</span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="ct-autosave ct-autosave-ok"><CheckCircle size={12} /> Guardado</span>
          )}
          {autoSaveStatus === 'error' && (
            <span className="ct-autosave ct-autosave-err"><AlertCircle size={12} /> Error al guardar</span>
          )}
        </div>

        <div className="ct-editor-topbar-right">
          {canSubmit && (
            <button
              className="ct-btn ct-btn-accent ct-btn-sm"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
            >
              <Send size={14} />
              Enviar a revisión
            </button>
          )}
          {canEdit && (
            <button
              className="ct-btn ct-btn-primary ct-btn-sm"
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={14} />
              {saving ? 'Guardando...' : isNew ? 'Crear borrador' : 'Guardar'}
            </button>
          )}
        </div>
      </div>

      <div className="ct-editor-body">
        {/* Editor area */}
        <div className="ct-editor-main">
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {/* Importar desde DOCX — solo para documentos nuevos */}
            {isNew && !content && (
              <div style={{ marginBottom: 16 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  style={{ display: 'none' }}
                  onChange={handleImportDocx}
                />
                <button
                  type="button"
                  className="ct-btn ct-btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importStatus === 'loading'}
                >
                  {importStatus === 'loading' ? 'Importando...' : 'Importar desde .docx'}
                </button>
                {importStatus === 'error' && (
                  <p className="ct-error-text">{importError}</p>
                )}
              </div>
            )}
            <input
              type="text"
              placeholder="Título del documento..."
              value={title}
              onChange={onTitleChange}
              disabled={!canEdit}
              className={`ct-title-input${errors.title ? ' ct-input-error' : ''}`}
            />
            {errors.title && <p className="ct-error-text">{errors.title}</p>}
            {errors.content && <p className="ct-error-text" style={{ marginBottom: 8 }}>{errors.content}</p>}

            <Suspense fallback={<div className="ct-skeleton" style={{ height: 400 }} />}>
              {(isNew || post) ? (
                <ContributeMdxEditor key={id ?? 'new'} ref={editorRef} markdown={content} onChange={onContentChange} readOnly={!canEdit} postId={id} />
              ) : (
                <div className="ct-skeleton" style={{ height: 400 }} />
              )}
            </Suspense>

            {post?.status === 'rejected' && post.rejectionReason && (
              <div className="ct-rejection-box">
                <strong>Motivo del rechazo:</strong> {post.rejectionReason}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — only category + help */}
        <aside className="ct-editor-sidebar">
          <h3 className="ct-sidebar-heading">Datos del documento</h3>

          <div className="ct-field">
            <label className="ct-label">Área *</label>
            <select
              className={`ct-select${errors.categoryPath ? ' ct-input-error' : ''}`}
              value={categoryPath}
              onChange={onCategoryChange}
              disabled={!canEdit}
            >
              <option value="">Seleccionar...</option>
              {flatCats.map((c) => (
                <option key={c.path} value={c.path}>{c.label}</option>
              ))}
            </select>
            {errors.categoryPath && <p className="ct-error-text">{errors.categoryPath}</p>}
          </div>

          {/* Status guide */}
          <div className="ct-help-section">
            <h4 className="ct-help-title">¿Cómo funciona?</h4>
            <ol className="ct-help-steps">
              <li><strong>Escribí tu documento</strong> — Título y contenido</li>
              <li><strong>Guardar borrador</strong> — Se guarda automáticamente</li>
              <li><strong>Enviar a revisión</strong> — Un admin lo revisa</li>
              <li><strong>Publicación</strong> — Si es aprobado, se publica</li>
            </ol>
          </div>

          {/* Post info */}
          {post && (
            <div className="ct-post-detail">
              <div>Autor: <span>{post.authorDisplayName || post.author}</span></div>
              <div>Creado: <span>{new Date(post.createdAt).toLocaleString('es-AR')}</span></div>
              <div>Modificado: <span>{new Date(post.updatedAt).toLocaleString('es-AR')}</span></div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
