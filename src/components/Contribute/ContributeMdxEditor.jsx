/**
 * ContributeMdxEditor — Enhanced MDX editor for contributors.
 *
 * Same core as admin MdxEditor but with extra toolbar buttons:
 * - Emoji picker (common emojis, inserts at cursor)
 * - Component snippets (Alert, Card, admonitions, Kbd, etc.)
 */
import React, { forwardRef, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  toolbarPlugin,
  directivesPlugin,
  AdmonitionDirectiveDescriptor,
  jsxPlugin,
  NestedLexicalEditor,
  useMdastNodeUpdater,
  useLexicalNodeRemove,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertImage,
  InsertTable,
  ListsToggle,
  Separator,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { mediaApi, assetsApi } from '../Admin/api';
import { Smile, Puzzle, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Emoji data — grouped by category
// ---------------------------------------------------------------------------
const EMOJI_GROUPS = [
  { label: 'Comunes', emojis: ['😀', '😁', '😂', '🤣', '😊', '😍', '🥳', '🤔', '😎', '🙌', '👍', '👎', '👏', '🎉', '🔥', '💡', '⭐', '❤️', '✅', '❌'] },
  { label: 'Trabajo', emojis: ['📋', '📌', '📎', '📁', '📂', '📊', '📈', '📉', '🗂️', '📝', '✏️', '🔍', '🔗', '💻', '🖥️', '📧', '📞', '🗓️', '⏰', '🔔'] },
  { label: 'Alertas', emojis: ['⚠️', '🚨', '🛑', '⛔', 'ℹ️', '💬', '📢', '🔒', '🔓', '🔑', '🗝️', '🏷️', '🚀', '✨', '💎', '🎯', '📣', '🔧', '🛠️', '⚙️'] },
  { label: 'Flechas', emojis: ['➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '🔄', '🔃', '▶️', '◀️', '🔼', '🔽', '⏩', '⏪', '⏫', '⏬'] },
];

// ---------------------------------------------------------------------------
// Docusaurus component snippet templates
// ---------------------------------------------------------------------------
const SNIPPET_GROUPS = [
  {
    label: 'Bloques especiales',
    items: [
      { label: '💡 Consejo', snippet: '\n:::tip\nEscribí tu consejo aquí.\n:::\n' },
      { label: 'ℹ️ Nota', snippet: '\n:::note\nEscribí tu nota aquí.\n:::\n' },
      { label: '⚠️ Atención', snippet: '\n:::warning\nEscribí la advertencia aquí.\n:::\n' },
      { label: '🚨 Peligro', snippet: '\n:::danger\nEscribí el peligro aquí.\n:::\n' },
      { label: '📌 Información', snippet: '\n:::info\nEscribí la información aquí.\n:::\n' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Custom JSX Editor — shows component name, editable props, children, delete
// ---------------------------------------------------------------------------
const COMPONENT_META = {
  Alert: { icon: '🔔', color: '#3b82f6', label: 'Alert' },
  Card: { icon: '🃏', color: '#8b5cf6', label: 'Card' },
  CardGrid: { icon: '📐', color: '#6366f1', label: 'CardGrid' },
  Kbd: { icon: '⌨️', color: '#64748b', label: 'Kbd' },
  Steps: { icon: '📋', color: '#059669', label: 'Steps' },
  Step: { icon: '▶️', color: '#10b981', label: 'Step' },
  TabGroup: { icon: '📑', color: '#d97706', label: 'TabGroup' },
  Tab: { icon: '📄', color: '#f59e0b', label: 'Tab' },
};

function CmsJsxEditor({ mdastNode, descriptor }) {
  const updater = useMdastNodeUpdater();
  const removeNode = useLexicalNodeRemove();
  const meta = COMPONENT_META[mdastNode.name] || { icon: '📦', color: '#6b7280', label: mdastNode.name };
  const props = (mdastNode.attributes || []).filter(a => a.type === 'mdxJsxAttribute');

  const updateProp = (name, value) => {
    const newAttrs = (mdastNode.attributes || []).map(a =>
      a.type === 'mdxJsxAttribute' && a.name === name ? { ...a, value } : a
    );
    updater.setNode({ ...mdastNode, attributes: newAttrs });
  };

  return (
    <div className="ct-jsx-editor" style={{ borderLeftColor: meta.color }}>
      <div className="ct-jsx-header">
        <span className="ct-jsx-icon">{meta.icon}</span>
        <span className="ct-jsx-name">{meta.label}</span>
        {props.map(attr => (
          <label key={attr.name} className="ct-jsx-prop">
            <span className="ct-jsx-prop-name">{attr.name}:</span>
            <input
              type="text"
              value={typeof attr.value === 'string' ? attr.value : attr.value?.value || ''}
              onChange={(e) => updateProp(attr.name, e.target.value)}
              className="ct-jsx-prop-input"
            />
          </label>
        ))}
        <button
          type="button"
          className="ct-jsx-delete"
          title="Eliminar componente"
          onClick={removeNode}
        >
          <X size={14} />
        </button>
      </div>
      {descriptor.hasChildren && (
        <div className="ct-jsx-body">
          <NestedLexicalEditor
            block={descriptor.kind === 'flow'}
            getContent={(node) => node.children}
            getUpdatedMdastNode={(mdast, children) => ({ ...mdast, children })}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// JSX component descriptors — tells MDXEditor how to handle Docusaurus MDX
// ---------------------------------------------------------------------------
const JSX_COMPONENT_DESCRIPTORS = [
  {
    name: 'Alert',
    kind: 'flow',
    props: [
      { name: 'type', type: 'string' },
      { name: 'title', type: 'string' },
    ],
    hasChildren: true,
    Editor: CmsJsxEditor,
  },
  {
    name: 'Card',
    kind: 'flow',
    props: [
      { name: 'title', type: 'string' },
      { name: 'icon', type: 'string' },
    ],
    hasChildren: true,
    Editor: CmsJsxEditor,
  },
  {
    name: 'CardGrid',
    kind: 'flow',
    props: [],
    hasChildren: true,
    Editor: CmsJsxEditor,
  },
  {
    name: 'Kbd',
    kind: 'text',
    props: [],
    hasChildren: true,
    Editor: CmsJsxEditor,
  },
  {
    name: 'Steps',
    kind: 'flow',
    props: [],
    hasChildren: true,
    Editor: CmsJsxEditor,
  },
  {
    name: 'Step',
    kind: 'flow',
    props: [{ name: 'title', type: 'string' }],
    hasChildren: true,
    Editor: CmsJsxEditor,
  },
  {
    name: 'TabGroup',
    kind: 'flow',
    props: [],
    hasChildren: true,
    Editor: CmsJsxEditor,
  },
  {
    name: 'Tab',
    kind: 'flow',
    props: [{ name: 'label', type: 'string' }],
    hasChildren: true,
    Editor: CmsJsxEditor,
  },
];

// ---------------------------------------------------------------------------
// EmojiPicker — toolbar dropdown component
// ---------------------------------------------------------------------------
function EmojiPicker({ editorRef }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  // Position the portal panel aligned to the trigger button
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const openPanel = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const insert = (emoji) => {
    if (editorRef.current) {
      editorRef.current.focus();
      editorRef.current.insertMarkdown(emoji);
    }
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="ct-toolbar-btn"
        onClick={() => open ? setOpen(false) : openPanel()}
        title="Insertar emoji"
      >
        <Smile size={18} />
      </button>
      {open && createPortal(
        <div ref={panelRef} className="ct-emoji-panel" style={{ position: 'fixed', top: pos.top, left: pos.left }}>
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label} className="ct-emoji-group">
              <div className="ct-emoji-group-label">{group.label}</div>
              <div className="ct-emoji-grid">
                {group.emojis.map((emoji) => (
                  <button key={emoji} type="button" className="ct-emoji-btn" onClick={() => insert(emoji)}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// SnippetPicker — toolbar dropdown for Docusaurus components
// ---------------------------------------------------------------------------
function SnippetPicker({ editorRef }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const [pos, setPos] = useState({ top: 0, right: 0 });

  const openPanel = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const insert = (snippet) => {
    if (editorRef.current) {
      editorRef.current.focus();
      editorRef.current.insertMarkdown(snippet);
    }
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="ct-toolbar-btn"
        onClick={() => open ? setOpen(false) : openPanel()}
        title="Insertar componente"
      >
        <Puzzle size={18} />
      </button>
      {open && createPortal(
        <div ref={panelRef} className="ct-snippet-panel" style={{ position: 'fixed', top: pos.top, right: pos.right }}>
          {SNIPPET_GROUPS.map((group) => (
            <div key={group.label} className="ct-snippet-group">
              <div className="ct-snippet-group-label">{group.label}</div>
              {group.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="ct-snippet-btn"
                  onClick={() => insert(item.snippet)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main editor component
// ---------------------------------------------------------------------------
const ContributeMdxEditor = forwardRef(
  ({ markdown, onChange, readOnly = false, postId }, ref) => {
    const imageUploadHandler = async (image) => {
      if (postId) {
        // Upload as per-post asset → relative path works after publish
        const result = await assetsApi.upload(postId, 'images', image);
        return `./assets/images/${result.filename}`;
      }
      // Fallback for new posts without id yet
      const result = await mediaApi.upload(image);
      return result.url;
    };

    return (
      <div className="ct-mdx-editor-wrap">
        <MDXEditor
          ref={ref}
          markdown={markdown}
          onChange={onChange}
          readOnly={readOnly}
          contentEditableClassName="ct-prose"
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            markdownShortcutPlugin(),
            directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
            jsxPlugin({ jsxComponentDescriptors: JSX_COMPONENT_DESCRIPTORS }),
            linkPlugin(),
            linkDialogPlugin(),
            imagePlugin({ imageUploadHandler }),
            tablePlugin(),
            codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
            codeMirrorPlugin({
              codeBlockLanguages: {
                js: 'JavaScript',
                ts: 'TypeScript',
                jsx: 'JSX',
                tsx: 'TSX',
                python: 'Python',
                bash: 'Bash',
                sql: 'SQL',
                yaml: 'YAML',
                json: 'JSON',
                css: 'CSS',
                html: 'HTML',
                '': 'Plain text',
              },
            }),
            toolbarPlugin({
              toolbarContents: () => (
                <>
                  <UndoRedo />
                  <Separator />
                  <BoldItalicUnderlineToggles />
                  <Separator />
                  <BlockTypeSelect />
                  <ListsToggle />
                  <Separator />
                  <CreateLink />
                  <InsertImage />
                  <InsertTable />
                  <Separator />
                  <EmojiPicker editorRef={ref} />
                  <SnippetPicker editorRef={ref} />
                </>
              ),
            }),
          ]}
        />
      </div>
    );
  }
);

ContributeMdxEditor.displayName = 'ContributeMdxEditor';

export default ContributeMdxEditor;
