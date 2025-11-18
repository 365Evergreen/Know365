import * as React from 'react';
import { useState, useEffect, Suspense, lazy, useLayoutEffect } from 'react';
import { ThemeProvider, Stack, initializeIcons } from '@fluentui/react';
import { BrowserRouter as Router, Routes, Route, useParams, Navigate } from 'react-router-dom';

import { MsalProvider } from '@azure/msal-react';
import { lightTheme, darkTheme, createThemeFromConfig } from './theme';
import useAppConfig from './hooks/useAppConfig';
import { msalInstance } from './services/authConfig';
import Header from './components/Header';
import Footer from './components/Footer';
import './styles/global.css';
import AuthGate from './components/AuthGate';

const Home = lazy(() => import('./pages/Home'));
const Knowledge = lazy(() => import('./pages/Knowledge'));
const About = lazy(() => import('./pages/About'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminConfig = lazy(() => import('./pages/AdminConfig'));
const AdminUI = lazy(() => import('./pages/AdminUI'));
const AdminIcons = lazy(() => import('./pages/AdminIcons'));
const MyKnowledge = lazy(() => import('./pages/MyKnowledge'));
const MyContributions = lazy(() => import('./pages/MyContributions'));
const SavedItems = lazy(() => import('./pages/SavedItems'));
const RecentlyViewed = lazy(() => import('./pages/RecentlyViewed'));
const FunctionsIndex = lazy(() => import('./pages/FunctionsIndex'));
const FunctionsPage = lazy(() => import('./pages/FunctionsPage'));
const DocumentTypesIndex = lazy(() => import('./pages/DocumentTypesIndex'));
const DocumentPolicies = lazy(() => import('./pages/DocumentPolicies'));
const DocumentProcedures = lazy(() => import('./pages/DocumentProcedures'));
const DocumentFAQs = lazy(() => import('./pages/DocumentFAQs'));
const DocumentHowTo = lazy(() => import('./pages/DocumentHowTo'));
const Tags = lazy(() => import('./pages/Tags'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const Contribute = lazy(() => import('./pages/Contribute'));
const Help = lazy(() => import('./pages/Help'));
const MediaDemo = lazy(() => import('./pages/MediaDemo'));
const EntityMetadata = lazy(() => import('./pages/EntityMetadata'));
const ArticleCategories = lazy(() => import('./pages/ArticleCategories'));
const ArticlesBySubject = lazy(() => import('./pages/ArticlesBySubject'));
const DataverseDebug = lazy(() => import('./pages/DataverseDebug'));
const CommunicationsTest = lazy(() => import('./pages/CommunicationsTest'));

// Initialize Fluent UI icons
initializeIcons();

// lightweight page to consume readable urls
const BrowsePage: React.FC = () => {
  const params = useParams<{ category: string; item?: string }>();
  const { category, item } = params;

  // ...replace with real data-loading logic (graph/dataverse) as needed...
  if (!category) return <Navigate to="/" replace />;

  return (
    <div style={{ padding: 24 }}>
      <h1>{(category || '').replace(/-/g, ' ')}</h1>
      {item && <h2>{item.replace(/-/g, ' ')}</h2>}
      <p>Content for {category}{item ? ` / ${item}` : ''} goes here.</p>
    </div>
  );
};

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const { settings } = useAppConfig() as any;

  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
  }, []);

  // Build a runtime theme from app settings if provided (safe-guarded)
  const runtimeTheme = React.useMemo(() => {
    if (settings && (settings as any).theme) {
      try {
        return createThemeFromConfig((settings as any).theme);
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  }, [settings]);

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
  // Workaround: cast Route to a generic React component type to avoid @types/react / react-router-dom typing mismatch
  const RouteAsAny = Route as unknown as React.ComponentType<any>;
  // Workaround: cast Routes to a generic React component type to avoid @types/react / react-router-dom typing mismatch
  const RoutesAsAny = Routes as unknown as React.ComponentType<any>;

  // prefer runtime-configured theme if present, otherwise respect dark mode
  return (
    <MsalProviderAsAny instance={msalInstance}>
      <ThemeProvider theme={runtimeTheme || (isDarkMode ? darkTheme : lightTheme)}>
        <Router>
          <Stack
            verticalFill
            styles={{ root: { minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingTop: headerHeight } }}
          >
            <Header onToggleTheme={handleToggleTheme} isDarkMode={isDarkMode} logoUrl={settings?.logoUrl} />
            <AuthGate>
              <Suspense fallback={<div />}>
                {/* Workaround for react-router-dom / @types/react type incompatibility */}
                <RoutesAsAny>
                  <RouteAsAny path="/" element={<Home />} />
                  <RouteAsAny path="/knowledge" element={<Knowledge />} />
                  <RouteAsAny path="/about" element={<About />} />
                  <RouteAsAny path="/article-categories" element={<ArticleCategories />} />
                  <RouteAsAny path="/articles/:subjectId" element={<ArticlesBySubject />} />
                  <RouteAsAny path="/metadata" element={<EntityMetadata />} />
                  <RouteAsAny path="/admin" element={<AdminConfig />} />
                  <RouteAsAny path="/admin/ui" element={<AdminUI />} />
                  <RouteAsAny path="/admin/icons" element={<AdminIcons />} />
                  <RouteAsAny path="/my-knowledge" element={<MyKnowledge />} />
                  <RouteAsAny path="/my-knowledge/contributions" element={<MyContributions />} />
                  <RouteAsAny path="/my-knowledge/saved" element={<SavedItems />} />
                  <RouteAsAny path="/my-knowledge/recent" element={<RecentlyViewed />} />
                  <RouteAsAny path="/functions" element={<FunctionsIndex />} />
                  <RouteAsAny path="/functions/:fn" element={<FunctionsPage />} />
                  <RouteAsAny path="/document-types" element={<DocumentTypesIndex />} />
                  <RouteAsAny path="/document-types/policies" element={<DocumentPolicies />} />
                  <RouteAsAny path="/document-types/procedures" element={<DocumentProcedures />} />
                  <RouteAsAny path="/document-types/faqs" element={<DocumentFAQs />} />
                  <RouteAsAny path="/document-types/how-to" element={<DocumentHowTo />} />
                  <RouteAsAny path="/tags" element={<Tags />} />
                  <RouteAsAny path="/test/communications" element={<CommunicationsTest />} />
                  <RouteAsAny path="/search" element={<SearchPage />} />
                  <RouteAsAny path="/contribute" element={<Contribute />} />
                  <RouteAsAny path="/help" element={<Help />} />
                  <RouteAsAny path="/media-demo" element={<MediaDemo />} />
                  <RouteAsAny path="/dataverse-debug" element={<DataverseDebug />} />
                  <RouteAsAny path="/settings" element={<Settings />} />
                  <RouteAsAny path="/browse/:category/:item?" element={<BrowsePage />} />
                  {/* Redirect any unknown route back to home (prevents 404s on deep links) */}
                  <RouteAsAny path="*" element={<Navigate to="/" replace />} />
                </RoutesAsAny>
              </Suspense>
            </AuthGate>
            <Footer />
          </Stack>
        </Router>
      </ThemeProvider>
    </MsalProviderAsAny>
  );
};

export default App;
