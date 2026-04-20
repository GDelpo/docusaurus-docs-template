/**
 * Admin layout — sidebar + topbar + content area.
 *
 * Reads the current pathname to highlight the active nav item.
 * Navigation uses <a> tags for full reliability with the plugin route system.
 */
import React from 'react';
import { useLocation } from '@docusaurus/router';
import {
  BarChart3,
  FileText,
  PenTool,
  BookOpen,
  LogOut,
  ExternalLink,
} from 'lucide-react';

// TODO: replace with links to your own internal services/dashboards,
// or remove the "Services" section in the sidebar below if not needed.
const serviceLinks = [
  // { href: 'https://example.com/service-one/', label: 'Service One' },
  // { href: 'https://example.com/service-two/', label: 'Service Two' },
];

const navItems = [
  { href: '/dashboard', icon: BarChart3, label: 'Overview', key: 'overview' },
  { href: '/dashboard/posts', icon: FileText, label: 'Posts', key: 'posts' },
];

function getActiveKey(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/dashboard';
  if (clean.startsWith('/dashboard/posts') || clean.startsWith('/dashboard/editor')) return 'posts';
  return 'overview';
}

function getPageTitle(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/dashboard';
  if (clean.startsWith('/dashboard/editor')) return 'Editor';
  if (clean.match(/^\/dashboard\/posts\/\d+$/)) return 'Post detail';
  if (clean === '/dashboard/posts') return 'Posts';
  return 'Overview';
}

export default function AdminLayout({ children }) {
  const location = useLocation();
  const activeKey = getActiveKey(location.pathname);
  const pageTitle = getPageTitle(location.pathname);

  return (
    <>
      {/* Sidebar */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-logo">
          <div className="adm-sidebar-logo-icon">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="adm-sidebar-logo-text">CMS Docs</div>
            <div className="adm-sidebar-logo-sub">Dashboard</div>
          </div>
        </div>

        <nav className="adm-sidebar-nav">
          {navItems.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={`adm-nav-link ${activeKey === item.key ? 'active' : ''}`}
            >
              <item.icon size={16} />
              {item.label}
            </a>
          ))}

          <hr className="adm-separator" />

          <a href="/dashboard/editor" className="adm-nav-link">
            <PenTool size={16} />
            New Post
          </a>

          <a href="/contribuir" className="adm-nav-link adm-nav-link-sm">
            <PenTool size={14} />
            Contribute
          </a>

          <a href="/" className="adm-nav-link adm-nav-link-sm" target="_blank" rel="noopener">
            <BookOpen size={14} />
            View documentation
          </a>

          {serviceLinks.length > 0 && (
            <>
              <hr className="adm-separator" />

              <div style={{ padding: '0.25rem 0.75rem 0.25rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--adm-text-muted, #71717a)' }}>
                Services
              </div>

              {serviceLinks.map((s) => (
                <a key={s.href} href={s.href} className="adm-nav-link adm-nav-link-sm" target="_blank" rel="noopener">
                  <ExternalLink size={13} />
                  {s.label}
                </a>
              ))}
            </>
          )}
        </nav>

        <div className="adm-sidebar-footer">
          <a href="/auth/logout" className="adm-nav-link adm-nav-link-sm">
            <LogOut size={14} />
            Sign out
          </a>
        </div>
      </aside>

      {/* Main content */}
      <div className="adm-main">
        <header className="adm-topbar">
          <h1>{pageTitle}</h1>
        </header>
        <div className="adm-content">{children}</div>
      </div>
    </>
  );
}
