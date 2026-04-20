/**
 * MarkdownPreview — Lightweight markdown-to-HTML renderer.
 *
 * Converts markdown content to styled HTML for read-only preview.
 * Handles standard markdown + our custom JSX components (Alert, etc.).
 * Uses .ct-prose CSS from contribute.css for styling.
 */
import React, { useMemo } from 'react';

const ADMONITION_TITLES = {
  info: 'Información',
  warning: 'Advertencia',
  danger: 'Peligro',
  tip: 'Consejo',
  success: 'Éxito',
};

const ADMONITION_ICONS = {
  info: 'ℹ️',
  warning: '⚠️',
  danger: '🚨',
  tip: '💡',
  success: '✅',
};

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mdToHtml(md) {
  if (!md) return '';

  let html = md;

  // --- Phase 1: Extract and protect code blocks ---
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const i = codeBlocks.length;
    codeBlocks.push(
      `<pre class="ct-preview-code"><code class="language-${lang || 'text'}">${escapeHtml(code.trimEnd())}</code></pre>`
    );
    return `\n\x00CB${i}\x00\n`;
  });

  // --- Phase 2: JSX components ---

  // <Alert type="xxx">content</Alert> → styled admonition
  html = html.replace(
    /<Alert\s+type=["'](\w+)["']\s*>([\s\S]*?)<\/Alert>/g,
    (_, type, content) => {
      const title = ADMONITION_TITLES[type] || type;
      const icon = ADMONITION_ICONS[type] || '';
      return `<div class="ct-admonition ct-admonition-${type}"><div class="ct-admonition-title">${icon} ${title}</div><div class="ct-admonition-body">${content.trim()}</div></div>`;
    }
  );

  // <Card title="xxx">content</Card>
  html = html.replace(
    /<Card\s+[^>]*title=["']([^"']+)["'][^>]*>([\s\S]*?)<\/Card>/g,
    (_, title, content) =>
      `<div class="ct-preview-card"><strong>${title}</strong><div>${content.trim()}</div></div>`
  );

  // Strip remaining JSX component tags, keep inner content
  html = html.replace(
    /<\/?(CardGrid|Steps|Step|TabGroup|Tab|Kbd|DownloadButton|Video|Highlight)\b[^>]*>/g,
    ''
  );

  // --- Phase 3: Mermaid code blocks (already extracted) ---
  // They'll show as regular code blocks in preview

  // --- Phase 4: Tables ---
  html = html.replace(
    /^(\|.+\|)\n(\|[\s\-:|]+\|)\n((?:\|.+\|\n?)+)/gm,
    (_, header, _sep, body) => {
      const ths = header
        .split('|')
        .filter(c => c.trim())
        .map(c => `<th>${c.trim()}</th>`)
        .join('');
      const rows = body
        .trim()
        .split('\n')
        .map(row => {
          const tds = row
            .split('|')
            .filter(c => c.trim())
            .map(c => `<td>${c.trim()}</td>`)
            .join('');
          return `<tr>${tds}</tr>`;
        })
        .join('');
      return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
    }
  );

  // --- Phase 5: Block-level elements ---

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Blockquotes — multi-line
  html = html.replace(
    /(^>\s?.+(?:\n>?\s?.+)*)/gm,
    (match) => {
      const inner = match.replace(/^>\s?/gm, '').trim();
      return `<blockquote><p>${inner}</p></blockquote>`;
    }
  );

  // Horizontal rules
  html = html.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr />');

  // Unordered lists — consecutive lines starting with - or *
  html = html.replace(
    /((?:^[\-\*]\s+.+\n?)+)/gm,
    (block) => {
      const items = block
        .trim()
        .split('\n')
        .map(line => `<li>${line.replace(/^[\-\*]\s+/, '')}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }
  );

  // Ordered lists — consecutive lines starting with digits
  html = html.replace(
    /((?:^\d+\.\s+.+\n?)+)/gm,
    (block) => {
      const items = block
        .trim()
        .split('\n')
        .map(line => `<li>${line.replace(/^\d+\.\s+/, '')}</li>`)
        .join('');
      return `<ol>${items}</ol>`;
    }
  );

  // --- Phase 6: Inline elements ---

  // Bold + italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Images
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" loading="lazy" />'
  );

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );

  // --- Phase 7: Wrap loose text in paragraphs ---
  html = html
    .split('\n\n')
    .map(block => {
      block = block.trim();
      if (!block) return '';
      // Don't wrap blocks that are already HTML elements or code block placeholders
      if (/^<(h[1-6]|ul|ol|li|table|thead|tbody|tr|blockquote|hr|pre|div|img)[\s>\/]/i.test(block)) return block;
      if (/^\x00CB\d+\x00$/.test(block)) return block;
      return `<p>${block.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  // --- Phase 8: Restore code blocks ---
  codeBlocks.forEach((block, i) => {
    html = html.replace(`\x00CB${i}\x00`, block);
  });

  return html;
}

export default function MarkdownPreview({ content }) {
  const html = useMemo(() => mdToHtml(content), [content]);

  if (!content) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ct-text-muted)' }}>
        Sin contenido
      </div>
    );
  }

  return (
    <div
      className="ct-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
