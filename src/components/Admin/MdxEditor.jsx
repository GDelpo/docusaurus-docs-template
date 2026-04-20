/**
 * MDXEditor wrapper component.
 *
 * Lazy-loaded by the PostEditor page. Provides a rich markdown editor
 * with toolbar, headings, lists, links, images (upload to CMS), tables,
 * and code blocks with CodeMirror.
 */
import React, { forwardRef } from 'react';
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
  InsertThematicBreak,
  ListsToggle,
  CodeToggle,
  InsertCodeBlock,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { mediaApi } from './api';

// Custom JSX editor with inline prop editing and delete button
function AdminJsxEditor({ mdastNode, descriptor }) {
  const updater = useMdastNodeUpdater();
  const removeNode = useLexicalNodeRemove();
  const props = (mdastNode.attributes || []).filter(a => a.type === 'mdxJsxAttribute');

  const updateProp = (name, value) => {
    const newAttrs = (mdastNode.attributes || []).map(a =>
      a.type === 'mdxJsxAttribute' && a.name === name ? { ...a, value } : a
    );
    updater.setNode({ ...mdastNode, attributes: newAttrs });
  };

  return (
    <div className="adm-jsx-editor">
      <div className="adm-jsx-header">
        <span className="adm-jsx-name">{mdastNode.name}</span>
        {props.map(attr => (
          <label key={attr.name} className="adm-jsx-prop">
            <span>{attr.name}:</span>
            <input
              type="text"
              value={typeof attr.value === 'string' ? attr.value : attr.value?.value || ''}
              onChange={(e) => updateProp(attr.name, e.target.value)}
            />
          </label>
        ))}
        <button type="button" className="adm-jsx-delete" title="Eliminar" onClick={removeNode}>✕</button>
      </div>
      {descriptor.hasChildren && (
        <div className="adm-jsx-body">
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

// JSX component descriptors for Docusaurus MDX components
const JSX_COMPONENT_DESCRIPTORS = [
  {
    name: 'Alert',
    kind: 'flow',
    props: [
      { name: 'type', type: 'string' },
      { name: 'title', type: 'string' },
    ],
    hasChildren: true,
    Editor: AdminJsxEditor,
  },
  {
    name: 'Card',
    kind: 'flow',
    props: [
      { name: 'title', type: 'string' },
      { name: 'icon', type: 'string' },
    ],
    hasChildren: true,
    Editor: AdminJsxEditor,
  },
  {
    name: 'CardGrid',
    kind: 'flow',
    props: [],
    hasChildren: true,
    Editor: AdminJsxEditor,
  },
  {
    name: 'Kbd',
    kind: 'text',
    props: [],
    hasChildren: true,
    Editor: AdminJsxEditor,
  },
  {
    name: 'Steps',
    kind: 'flow',
    props: [],
    hasChildren: true,
    Editor: AdminJsxEditor,
  },
  {
    name: 'Step',
    kind: 'flow',
    props: [
      { name: 'title', type: 'string' },
    ],
    hasChildren: true,
    Editor: AdminJsxEditor,
  },
  {
    name: 'TabGroup',
    kind: 'flow',
    props: [],
    hasChildren: true,
    Editor: AdminJsxEditor,
  },
  {
    name: 'Tab',
    kind: 'flow',
    props: [
      { name: 'label', type: 'string' },
    ],
    hasChildren: true,
    Editor: AdminJsxEditor,
  },
];

const MdxEditorComponent = forwardRef(
  ({ markdown, onChange, readOnly = false }, ref) => {
    const imageUploadHandler = async (image) => {
      const result = await mediaApi.upload(image);
      return result.url;
    };

    return (
      <MDXEditor
        ref={ref}
        markdown={markdown}
        onChange={onChange}
        readOnly={readOnly}
        contentEditableClassName="adm-prose"
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
                <BoldItalicUnderlineToggles />
                <CodeToggle />
                <BlockTypeSelect />
                <ListsToggle />
                <CreateLink />
                <InsertImage />
                <InsertTable />
                <InsertCodeBlock />
                <InsertThematicBreak />
              </>
            ),
          }),
        ]}
      />
    );
  }
);

MdxEditorComponent.displayName = 'MdxEditor';

export default MdxEditorComponent;
