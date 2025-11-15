import React, { useState, useEffect, Suspense, lazy, useLayoutEffect } from 'react';
import { ThemeProvider, Stack, initializeIcons } from '@fluentui/react';
import { BrowserRouter as Router, Routes, Route, useParams, Navigate } from 'react-router-dom';

import { MsalProvider } from '@azure/msal-react';
import { lightTheme, darkTheme } from './theme';
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
const AdminIcons = lazy(() => import('./pages/AdminIcons'));
const MyKnowledge = lazy(() => import('./pages/MyKnowledge'));
const MyContributions = lazy(() => import('./pages/MyContributions'));
const SavedItems = lazy(() => import('./pages/SavedItems'));
const RecentlyViewed = lazy(() => import('./pages/RecentlyViewed'));
const FunctionsIndex = lazy(() => import('./pages/FunctionsIndex'));
const FunctionsOperations = lazy(() => import('./pages/FunctionsOperations'));
const FunctionsCustomerService = lazy(() => import('./pages/FunctionsCustomerService'));
const FunctionsFinance = lazy(() => import('./pages/FunctionsFinance'));
const FunctionsHR = lazy(() => import('./pages/FunctionsHR'));
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
        <Router>
          <Stack
            verticalFill
            styles={{ root: { minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingTop: headerHeight } }}
          >
            <Header onToggleTheme={handleToggleTheme} isDarkMode={isDarkMode} />
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
                  <Route path="/my-knowledge" element={<MyKnowledge />} />
                  <Route path="/my-knowledge/contributions" element={<MyContributions />} />
                  <Route path="/my-knowledge/saved" element={<SavedItems />} />
                  <Route path="/my-knowledge/recent" element={<RecentlyViewed />} />
                  <Route path="/functions" element={<FunctionsIndex />} />
                  <Route path="/functions/operations" element={<FunctionsOperations />} />
                  <Route path="/functions/customer-service" element={<FunctionsCustomerService />} />
                  <Route path="/functions/finance" element={<FunctionsFinance />} />
                  <Route path="/functions/hr" element={<FunctionsHR />} />
                  <Route path="/document-types" element={<DocumentTypesIndex />} />
                  <Route path="/document-types/policies" element={<DocumentPolicies />} />
                  <Route path="/document-types/procedures" element={<DocumentProcedures />} />
                  <Route path="/document-types/faqs" element={<DocumentFAQs />} />
                  <Route path="/document-types/how-to" element={<DocumentHowTo />} />
                  <Route path="/tags" element={<Tags />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/contribute" element={<Contribute />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/media-demo" element={<MediaDemo />} />
                  <Route path="/dataverse-debug" element={<DataverseDebug />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/browse/:category/:item?" element={<BrowsePage />} />
                </Routes>
              </AuthGate>
            </Suspense>
            <Footer />
          </Stack>
        </Router>
      </ThemeProvider>
    </MsalProviderAsAny>
  );
};

export default App;
