import React, { useState, useEffect } from 'react';
import {
  useTheme,
  IconButton,
  Panel,
  PanelType,
  Stack,
} from '@fluentui/react';
import { SunIcon, MoonIcon } from '../icons/SvgIcons';
import MegaMenu, { MegaMenuItem } from './MegaMenu';
// Header receives runtime logo via props; no direct Dataverse lookup here

interface HeaderProps {
  onToggleTheme: () => void;
  isDarkMode: boolean;
  userName?: string;
  logoUrl?: string | null;
}

const Header: React.FC<HeaderProps> = ({ onToggleTheme, isDarkMode, logoUrl }) => {
  const theme = useTheme();
  const headerRef = React.useRef<HTMLElement | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // theme toggle rendered directly in the header
  const defaultLogoUrl = 'https://blobknow365.blob.core.windows.net/assets/know365-logo.svg';
  const currentLogo = logoUrl || defaultLogoUrl;

  // Primary items for the CommandBar; include brand/logo as the first item
  const menuData: MegaMenuItem[] = [
    { title: 'Home', icon: 'Home', url: '/', description: 'Landing page with featured content and search' },
    {
      title: 'My Knowledge',
      icon: 'Contact',
      url: '/browse/my-knowledge',
      children: [
        { title: 'My Contributions', url: '/browse/my-knowledge/contributions' },
        { title: 'Saved Items', url: '/browse/my-knowledge/saved' },
        { title: 'Recently Viewed', url: '/browse/my-knowledge/recent' },
      ],
    },
    {
      title: 'Browse by Function',
      icon: 'Work',
      url: '/browse/functions',
      children: [
        { title: 'Operations', url: '/browse/functions/operations' },
        { title: 'Customer Service', url: '/browse/functions/customer-service' },
        { title: 'Finance', url: '/browse/functions/finance' },
        { title: 'HR', url: '/browse/functions/hr' },
      ],
    },
    {
      title: 'Document Types',
      icon: 'Page',
      url: '/browse/document-types',
      children: [
        { title: 'Policies', url: '/browse/document-types/policies' },
        { title: 'Procedures', url: '/browse/document-types/procedures' },
        { title: 'FAQs', url: '/browse/document-types/faqs' },
        { title: 'How-To Guides', url: '/browse/document-types/how-to' },
      ],
    },
    { title: 'Tags & Topics', icon: 'Tag', url: '/browse/tags', description: 'Browse content by thematic tags' },
    { title: 'Contribute Knowledge', icon: 'Upload', url: '/browse/contribute', description: 'Submit new knowledge items' },
    { title: 'Help & Support', icon: 'Help', url: '/browse/help', description: 'FAQs and guidance on using the site' },
    { title: 'Admin', icon: 'Settings', url: '/browse/admin', description: 'Manage content and view analytics', visibleTo: ['Manager', 'Admin'] },
  ];

  React.useEffect(() => {
    if (!headerRef.current) return;
    const el = headerRef.current;
    const setVar = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--app-header-height', `${Math.ceil(h)}px`);
    };

    setVar();
    const ro = new ResizeObserver(() => setVar());
    ro.observe(el);
    window.addEventListener('resize', setVar);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', setVar);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      role="banner"
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: 80,
        paddingTop: 10,
        paddingBottom: 10,
        background: theme.semanticColors.bodyBackground || theme.palette.neutralLighter,
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingLeft: 16, paddingRight: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/" aria-label="Home" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <img src={currentLogo as string} alt="Know365" className="header-logo" style={{ height: 48 }} />
            </a>
            <MegaMenu items={menuData} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isDarkMode ? (
              <SunIcon onClick={onToggleTheme} style={{ cursor: 'pointer' }} />
            ) : (
              <MoonIcon onClick={onToggleTheme} style={{ cursor: 'pointer' }} />
            )}
          </div>
        </div>
      )}

      {isMobile && (
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center" styles={{ root: { padding: '6px 12px' } }}>
          <IconButton iconProps={{ iconName: 'GlobalNavButton' }} ariaLabel="Open menu" onClick={() => setMenuOpen(true)} />
          <div style={{ fontWeight: 600 }}>{/* simple title */}Knowledge Centre</div>
          <div>
            {isDarkMode ? (
              <SunIcon onClick={onToggleTheme} style={{ cursor: 'pointer' }} />
            ) : (
              <MoonIcon onClick={onToggleTheme} style={{ cursor: 'pointer' }} />
            )}
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
          <MegaMenu items={menuData} isMobile />
        </Stack>
      </Panel>
    </header>
  );
};

export default Header;
