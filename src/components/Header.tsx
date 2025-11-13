import React from 'react';
import { CommandBar, ICommandBarItemProps, SearchBox, Persona, PersonaSize } from '@fluentui/react';

interface HeaderProps {
  onToggleTheme: () => void;
  isDarkMode: boolean;
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ onToggleTheme, isDarkMode, userName = 'User' }) => {
  const items: ICommandBarItemProps[] = [
    {
      key: 'home',
      text: 'Home',
      iconProps: { iconName: 'Home' },
      href: '#',
    },
    {
      key: 'docs',
      text: 'Documents',
      iconProps: { iconName: 'Documentation' },
      href: '#',
    },
    {
      key: 'search',
      text: 'Search',
      iconProps: { iconName: 'Search' },
      href: '#',
    },
  ];

  const farItems: ICommandBarItemProps[] = [
    {
      key: 'searchBox',
      onRender: () => (
        <SearchBox
          placeholder="Search knowledge..."
          ariaLabel="Search knowledge articles"
          styles={{ root: { width: 200, marginRight: 10 } }}
        />
      ),
    },
    {
      key: 'themeToggle',
      text: isDarkMode ? 'Light Mode' : 'Dark Mode',
      iconProps: { iconName: isDarkMode ? 'Sunny' : 'ClearNight' },
      onClick: onToggleTheme,
      ariaLabel: 'Toggle theme',
    },
    {
      key: 'profile',
      onRender: () => (
        <Persona
          text={userName}
          size={PersonaSize.size32}
          styles={{ root: { marginLeft: 10 } }}
        />
      ),
    },
  ];

  return (
    <header role="banner" aria-label="Main navigation">
      <CommandBar
        items={items}
        farItems={farItems}
        ariaLabel="Main navigation commands"
      />
    </header>
  );
};

export default Header;
