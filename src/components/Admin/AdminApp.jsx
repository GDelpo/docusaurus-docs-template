/**
 * Admin CMS — Main App shell.
 *
 * Provides QueryClient, admin layout, and client-side routing.
 * Uses useLocation from Docusaurus's router to determine which sub-page to show.
 */
import React, { Suspense, createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useLocation } from '@docusaurus/router';
import { userApi } from './api';
import AdminLayout from './AdminLayout';
import '@site/src/css/admin.css';

// ---------------------------------------------------------------------------
// Navigation context — simple window.location.href for full reliability
// ---------------------------------------------------------------------------
const NavigateCtx = createContext(() => {});

export function useAdminNavigate() {
  return useContext(NavigateCtx);
}

// ---------------------------------------------------------------------------
// User context — role-based access control
// ---------------------------------------------------------------------------
const UserCtx = createContext(null);

export function useAdminUser() {
  return useContext(UserCtx);
}

export function useIsAdmin() {
  const user = useAdminUser();
  return user?.role === 'admin';
}

function navigateTo(path) {
  // Use history.pushState + popstate for SPA-like navigation
  // Falls back to full page load if anything goes wrong
  try {
    window.history.pushState({}, '', path);
    // Dispatch a popstate so React Router (Docusaurus) picks up the change
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch {
    window.location.href = path;
  }
}

// ---------------------------------------------------------------------------
// React Query client
// ---------------------------------------------------------------------------
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

// ---------------------------------------------------------------------------
// Lazy-loaded page components
// ---------------------------------------------------------------------------
const Overview = React.lazy(() => import('./pages/Overview'));
const PostsList = React.lazy(() => import('./pages/PostsList'));
const PostDetail = React.lazy(() => import('./pages/PostDetail'));
const PostEditor = React.lazy(() => import('./pages/PostEditor'));

// ---------------------------------------------------------------------------
// Router — parses pathname to render the right page
// ---------------------------------------------------------------------------
function AdminRouter() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '') || '/dashboard';
  const adminPath = pathname.replace(/^\/dashboard/, '') || '/';
  const segments = adminPath.split('/').filter(Boolean);

  let page;

  switch (segments[0]) {
    case 'posts':
      if (segments[1]) {
        page = <PostDetail id={Number(segments[1])} />;
      } else {
        page = <PostsList />;
      }
      break;
    case 'editor':
      if (segments[1]) {
        page = <PostEditor id={Number(segments[1])} />;
      } else {
        page = <PostEditor />;
      }
      break;
    default:
      page = <Overview />;
  }

  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, color: '#71717a' }}>Cargando...</div>
      }
    >
      {page}
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function AccessDenied() {
  return (
    <div id="admin-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#fafafa' }}>Acceso restringido</h2>
        <p style={{ color: '#71717a', fontSize: 14, marginBottom: 28 }}>
          El dashboard está disponible solo para administradores.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <a href="/contribuir" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: '#3b82f6', color: '#fff', textDecoration: 'none',
            width: 200, justifyContent: 'center',
          }}>
            Ir a Contribuir
          </a>
          <a href="/auth/logout?redirect=%2Fdashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: 'transparent', color: '#71717a', textDecoration: 'none',
            border: '1px solid #3f3f46', width: 200, justifyContent: 'center',
          }}>
            Entrar como admin
          </a>
        </div>
      </div>
    </div>
  );
}

function AdminAppInner() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: userApi.me,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div id="admin-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span style={{ color: '#71717a' }}>Cargando...</span>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }

  return (
    <UserCtx.Provider value={user}>
      <NavigateCtx.Provider value={navigateTo}>
        <div id="admin-root">
          <AdminLayout>
            <AdminRouter />
          </AdminLayout>
        </div>
      </NavigateCtx.Provider>
    </UserCtx.Provider>
  );
}

export default function AdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAppInner />
    </QueryClientProvider>
  );
}
