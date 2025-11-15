import React, { useState, useEffect, Suspense, lazy, useLayoutEffect } from 'react';
import { ThemeProvider, Stack, initializeIcons } from '@fluentui/react';

import { MsalProvider } from '@azure/msal-react';
import { lightTheme, darkTheme } from './theme';
import { msalInstance } from './services/authConfig';
import Header from './components/Header';
import Footer from './components/Footer';
import './styles/global.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthGate from './components/AuthGate';

const Home = lazy(() => import('./pages/Home'));
const Knowledge = lazy(() => import('./pages/Knowledge'));
const About = lazy(() => import('./pages/About'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminConfig = lazy(() => import('./pages/AdminConfig'));
const AdminIcons = lazy(() => import('./pages/AdminIcons'));
const MediaDemo = lazy(() => import('./pages/MediaDemo'));
const EntityMetadata = lazy(() => import('./pages/EntityMetadata'));
const ArticleCategories = lazy(() => import('./pages/ArticleCategories'));
const ArticlesBySubject = lazy(() => import('./pages/ArticlesBySubject'));

// Initialize Fluent UI icons
initializeIcons();

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userName] = useState<string>('User');
  const [headerHeight, setHeaderHeight] = useState<number>(0);

  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
  }, []);

  const handleToggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  useLayoutEffect(() => {
    const updateHeaderHeight = () => {
      const el = document.querySelector('header[role="banner"]') as HTMLElement | null;
      if (!el) {
        setHeaderHeight(0);
        return;
      }

      // Prefer a CSS variable if defined on the header (allows fixed-height header via CSS)
      const computed = getComputedStyle(el);
      const cssVar = computed.getPropertyValue('--header-height')?.trim();
      if (cssVar) {
        // cssVar may include 'px' — parse int
        const parsed = parseInt(cssVar.replace('px', '').trim(), 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          setHeaderHeight(parsed);
          return;
        }
      }

      // Fallback to measured offsetHeight (layout effect avoids flicker)
      setHeaderHeight(el.offsetHeight || 0);
    };

    // measure on mount synchronously before paint
    updateHeaderHeight();
    // update on resize
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  // Workaround: cast MsalProvider to a generic React component type to avoid JSX typing mismatch
  const MsalProviderAsAny = MsalProvider as unknown as React.ComponentType<any>;

  return (
    <MsalProviderAsAny instance={msalInstance}>
      <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
        <BrowserRouter>
          <Stack
            verticalFill
            styles={{ root: { minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingTop: headerHeight } }}
          >
            <Header onToggleTheme={handleToggleTheme} isDarkMode={isDarkMode} userName={userName} />
            <Suspense fallback={<div style={{ padding: 24 }}>Loading page…</div>}>
              <AuthGate>
                {/* Workaround for react-router-dom / @types/react type incompatibility */}
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/knowledge" element={<Knowledge />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/article-categories" element={<ArticleCategories />} />
                  <Route path="/articles/:subjectId" element={<ArticlesBySubject />} />
                  <Route path="/metadata" element={<EntityMetadata />} />
                  <Route path="/admin" element={<AdminConfig />} />
                  <Route path="/admin/icons" element={<AdminIcons />} />
                  <Route path="/media-demo" element={<MediaDemo />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </AuthGate>
            </Suspense>
            <Footer />
          </Stack>
        </BrowserRouter>
      </ThemeProvider>
    </MsalProviderAsAny>
  );
};

export default App;