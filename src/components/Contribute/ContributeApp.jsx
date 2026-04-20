/**
 * Contribute CMS — App shell.
 *
 * Lightweight contributor area with user context and routing.
 * Uses Docusaurus Layout (navbar/footer shown by parent).
 */
import React, { Suspense, createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useLocation } from '@docusaurus/router';
import { userApi } from '../Admin/api';
import '@site/src/css/contribute.css';

// ---------------------------------------------------------------------------
// Navigation context
// ---------------------------------------------------------------------------
const NavigateCtx = createContext(() => {});

export function useContributeNavigate() {
  return useContext(NavigateCtx);
}

// ---------------------------------------------------------------------------
// User context
// ---------------------------------------------------------------------------
const UserCtx = createContext(null);

export function useContributeUser() {
  return useContext(UserCtx);
}

export function useIsAdmin() {
  const user = useContributeUser();
  return user?.role === 'admin';
}

function navigateTo(path) {
  try {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch {
    window.location.href = path;
  }
}

// ---------------------------------------------------------------------------
// Query client
// ---------------------------------------------------------------------------
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

// ---------------------------------------------------------------------------
// Lazy pages
// ---------------------------------------------------------------------------
const MyPosts = React.lazy(() => import('./pages/MyPosts'));
const ContributeDetail = React.lazy(() => import('./pages/ContributeDetail'));
const ContributeEditor = React.lazy(() => import('./pages/ContributeEditor'));

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
function ContributeRouter() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '') || '/contribuir';
  const subPath = pathname.replace(/^\/contribuir/, '') || '/';
  const segments = subPath.split('/').filter(Boolean);

  let page;

  switch (segments[0]) {
    case 'editor':
      if (segments[1]) {
        page = <ContributeEditor id={Number(segments[1])} />;
      } else {
        page = <ContributeEditor />;
      }
      break;
    case 'post':
      if (segments[1]) {
        page = <ContributeDetail id={Number(segments[1])} />;
      } else {
        page = <MyPosts />;
      }
      break;
    default:
      page = <MyPosts />;
  }

  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#71717a' }}>Cargando...</div>}>
      {page}
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
function ContributeAppInner() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: userApi.me,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return (
    <UserCtx.Provider value={user ?? null}>
      <NavigateCtx.Provider value={navigateTo}>
        <div id="contribute-root">
          <ContributeRouter />
        </div>
      </NavigateCtx.Provider>
    </UserCtx.Provider>
  );
}

export default function ContributeApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ContributeAppInner />
    </QueryClientProvider>
  );
}
