import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import Home from '@/pages/home';
import { ThemeProvider, useTheme } from '@/components/theme-provider';
const Workspace = lazy(() => import('@/pages/workspace'));

export default function App() {
  return <ThemeProvider><AppContent /></ThemeProvider>;
}

function AppContent() {
  const { resolvedTheme } = useTheme();
  const location = useLocation();
  useEffect(() => {
    const isWorkspace = location.pathname.startsWith('/workspace');
    document.title = isWorkspace ? 'Workspace — Locale' : 'Locale — i18next JSON editor';
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.append(robots); }
    robots.content = isWorkspace ? 'noindex,nofollow' : 'index,follow';
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return <><Routes><Route path="/" element={<Home />} /><Route path="/workspace" element={<Suspense fallback={<div className="loading-page">Opening your workspace…</div>}><Workspace /></Suspense>} /><Route path="*" element={<div className="not-found"><h1>This page wandered off.</h1><p>Your words are still safe.</p><a href="/">Back to Locale →</a></div>} /></Routes><Toaster position="bottom-right" theme={resolvedTheme} richColors closeButton /></>;
}
