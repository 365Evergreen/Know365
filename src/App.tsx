import React, { useState, useEffect } from 'react';
import { ThemeProvider, Stack, initializeIcons } from '@fluentui/react';
import { MsalProvider } from '@azure/msal-react';
import { lightTheme, darkTheme } from './theme';
import { msalInstance } from './services/authConfig';
import Header from './components/Header';
import Hero from './components/Hero';
import ContentTabs from './components/ContentTabs';
import Footer from './components/Footer';
import './styles/global.css';

// Initialize Fluent UI icons
initializeIcons();

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userName, setUserName] = useState<string>('User');

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

  return (
    <MsalProvider instance={msalInstance}>
      <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
        <Stack verticalFill styles={{ root: { minHeight: '100vh', display: 'flex', flexDirection: 'column' } }}>
          <Header onToggleTheme={handleToggleTheme} isDarkMode={isDarkMode} userName={userName} />
          <Hero />
          <ContentTabs />
          <Footer />
        </Stack>
      </ThemeProvider>
    </MsalProvider>
  );
};

export default App;
