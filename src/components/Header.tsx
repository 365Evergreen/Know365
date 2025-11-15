import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  CommandBar,
  ICommandBarItemProps,
  SearchBox,
  Persona,
  PersonaSize,
  Icon,
  useTheme,
  DefaultButton,
  IconButton,
  Panel,
  PanelType,
  Stack,
} from '@fluentui/react';
import useAuth from '../hooks/useAuth';
import { getEntityRecords } from '../services/dataverseClient';

interface HeaderProps {
  onToggleTheme: () => void;
  isDarkMode: boolean;
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ onToggleTheme, isDarkMode, userName = 'User' }) => {
  const theme = useTheme();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const items: ICommandBarItemProps[] = [
    {
      key: 'home',
      text: 'Home',
      iconProps: { iconName: 'Home' },
      onRender: () => (
        <NavLink
          to="/"
          style={({ isActive }) => ({
            textDecoration: 'none',
            color: isActive ? theme.palette.themePrimary : undefined,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 8px',
            borderRadius: 4,
          })}
        >
          <Icon iconName="Home" styles={{ root: { color: 'inherit' } }} />
          <span>Home</span>
        </NavLink>
      ),
    },
    {
      key: 'docs',
      text: 'Documents',
      iconProps: { iconName: 'Documentation' },
      onRender: () => (
        <NavLink
          to="/knowledge"
          style={({ isActive }) => ({
            textDecoration: 'none',
            color: isActive ? theme.palette.themePrimary : undefined,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 8px',
            borderRadius: 4,
          })}
        >
          <Icon iconName="Documentation" styles={{ root: { color: 'inherit' } }} />
          <span>Documents</span>
        </NavLink>
      ),
    },
    {
      key: 'search',
      text: 'Search',
      iconProps: { iconName: 'Search' },
      onRender: () => (
        <NavLink
          to="/knowledge"
          style={({ isActive }) => ({
            textDecoration: 'none',
            color: isActive ? theme.palette.themePrimary : undefined,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 8px',
            borderRadius: 4,
          })}
        >
          <Icon iconName="Search" styles={{ root: { color: 'inherit' } }} />
          <span>Search</span>
        </NavLink>
      ),
    },
    {
      key: 'admin',
      text: 'Admin',
      iconProps: { iconName: 'Settings' },
      onRender: () => (
        <NavLink
          to="/admin"
          style={({ isActive }) => ({
            textDecoration: 'none',
            color: isActive ? theme.palette.themePrimary : undefined,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 8px',
            borderRadius: 4,
          })}
        >
          <Icon iconName="Settings" styles={{ root: { color: 'inherit' } }} />
          <span>Admin</span>
        </NavLink>
      ),
    },
    {
      key: 'metadata',
      text: 'Metadata',
      iconProps: { iconName: 'Database' },
      onRender: () => (
        <NavLink
          to="/metadata"
          style={({ isActive }) => ({
            textDecoration: 'none',
            color: isActive ? theme.palette.themePrimary : undefined,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 8px',
            borderRadius: 4,
          })}
        >
          <Icon iconName="Database" styles={{ root: { color: 'inherit' } }} />
          <span>Metadata</span>
        </NavLink>
      ),
    },
  ];

  const farItems: ICommandBarItemProps[] = [
    {
      key: 'searchBox',
      onRender: () => {
        const navigate = useNavigate();
        return (
          <SearchBox
            placeholder="Search knowledge..."
            ariaLabel="Search knowledge articles"
            styles={{ root: { width: 200, marginRight: 10 } }}
            onSearch={(newValue?: string) => {
              const q = newValue ?? '';
              navigate(`/knowledge?q=${encodeURIComponent(q)}`);
            }}
          />
        );
      },
    },
    {
      key: 'themeToggle',
      text: isDarkMode ? 'Light Mode' : 'Dark Mode',
      iconProps: { iconName: isDarkMode ? 'Sunny' : 'ClearNight' },
      onClick: onToggleTheme,
      ariaLabel: 'Toggle theme',
    },
    {
      key: 'auth',
      onRender: () => {
        const auth = useAuth();
        const signedIn = auth.isAuthenticated();

        return signedIn ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Persona text={userName} size={PersonaSize.size32} styles={{ root: { marginLeft: 10 } }} />
            <DefaultButton onClick={() => auth.logout()}>Sign out</DefaultButton>
          </div>
        ) : (
          <DefaultButton onClick={() => auth.login()}>Sign in</DefaultButton>
        );
      },
    },
  ];

  const navigate = useNavigate();
  const auth = useAuth();

  // Default public blob URL (public container). Will be used as a fallback.
  const defaultLogoUrl = 'https://blobknow365.blob.core.windows.net/assets/know365-logo.svg';
  const [logoUrl, setLogoUrl] = useState<string>(defaultLogoUrl);

  useEffect(() => {
    let mounted = true;
    const tryLoadFromDataverse = async () => {
      // Only attempt if user is signed in (Dataverse requires auth for reads)
      if (!auth || !auth.isAuthenticated || !auth.isAuthenticated()) return;
      
      try {
        const items = await getEntityRecords('e365_knowledgecentreconfigurations', 10);
        if (!mounted) return;
        if (Array.isArray(items) && items.length > 0) {
          // Find a likely URL field on the first record
          const r = items[0];
          const candidates = ['e365_asseturl', 'asseturl', 'new_asseturl', 'e365_value', 'value', 'configvalue', 'description', 'e365_thumbnailurl'];
          for (const k of candidates) {
            if (r[k] && typeof r[k] === 'string' && r[k].length > 5) {
              setLogoUrl(r[k]);
              break;
            }
          }
        }
      } catch (e) {
        // ignore and keep default
      } finally {
      }
    };

    tryLoadFromDataverse();
    return () => { mounted = false; };
  }, [auth]);

  return (
    <header
      role="banner"
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        paddingTop: 10,
        background: theme.semanticColors.bodyBackground || theme.palette.neutralLighter,
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
      }}
    >
      {!isMobile && (
        <CommandBar
          items={items}
          farItems={farItems}
          ariaLabel="Main navigation commands"
        />
      )}

      {isMobile && (
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center" styles={{ root: { padding: '6px 12px' } }}>
          <IconButton iconProps={{ iconName: 'GlobalNavButton' }} ariaLabel="Open menu" onClick={() => setMenuOpen(true)} />
          <div style={{ fontWeight: 600 }}>{/* simple title */}Knowledge Centre</div>
          <div>
            <Icon iconName={isDarkMode ? 'Sunny' : 'ClearNight'} onClick={onToggleTheme} style={{ cursor: 'pointer' }} />
          </div>
        </Stack>
      )}

      <Panel
        isOpen={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        type={PanelType.smallFixedNear}
        headerText="Menu"
      >
        <Stack tokens={{ childrenGap: 10 }}>
          <SearchBox
            placeholder="Search knowledge..."
            onSearch={(q?: string) => {
              const query = q ?? '';
              setMenuOpen(false);
              navigate(`/knowledge?q=${encodeURIComponent(query)}`);
            }}
          />
          <NavLink to="/" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
            Home
          </NavLink>
          <NavLink to="/knowledge" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
            Documents
          </NavLink>
          <NavLink to="/admin" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
            Admin
          </NavLink>
          <div>
            {useAuth().isAuthenticated() ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Persona text={userName} size={PersonaSize.size32} />
                <DefaultButton onClick={() => { useAuth().logout(); setMenuOpen(false); }}>Sign out</DefaultButton>
              </div>
            ) : (
              <DefaultButton onClick={() => { useAuth().login(); setMenuOpen(false); }}>Sign in</DefaultButton>
            )}
          </div>
        </Stack>
      </Panel>
      <img src={logoUrl} alt="Know365" style={{ height: 32 }} />
    </header>
  );
};

export default Header;
