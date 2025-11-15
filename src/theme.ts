import { createTheme, Theme } from '@fluentui/react';

export const lightTheme: Theme = createTheme({
  palette: {
    themePrimary: '#0078d4',
    themeLighterAlt: '#eff6fc',
    themeLighter: '#deecf9',
    themeLight: '#c7e0f4',
    themeTertiary: '#71afe5',
    themeSecondary: '#2b88d8',
    themeDarkAlt: '#106ebe',
    themeDark: '#005a9e',
    themeDarker: '#004578',
    neutralLighterAlt: '#faf9f8',
    neutralLighter: '#f3f2f1',
    neutralLight: '#edebe9',
    neutralQuaternaryAlt: '#e1dfdd',
    neutralQuaternary: '#d0d0d0',
    neutralTertiaryAlt: '#c8c6c4',
    neutralTertiary: '#a19f9d',
    neutralSecondary: '#605e5c',
    neutralPrimaryAlt: '#3b3a39',
    neutralPrimary: '#323130',
    neutralDark: '#201f1e',
    black: '#000000',
    white: '#ffffff',
  },
  // Ensure fonts are present so Fluent components can safely read theme.fonts.medium
  fonts: {
    small: { fontFamily: 'Segoe UI, Arial, sans-serif' },
    medium: { fontFamily: 'Segoe UI, Arial, sans-serif' },
    large: { fontFamily: 'Segoe UI, Arial, sans-serif' },
  },
});

export const darkTheme: Theme = createTheme({
  palette: {
    themePrimary: '#0078d4',
    themeLighterAlt: '#eff6fc',
    themeLighter: '#deecf9',
    themeLight: '#c7e0f4',
    themeTertiary: '#71afe5',
    themeSecondary: '#2b88d8',
    themeDarkAlt: '#106ebe',
    themeDark: '#005a9e',
    themeDarker: '#004578',
    neutralLighterAlt: '#1c1c1c',
    neutralLighter: '#252525',
    neutralLight: '#343434',
    neutralQuaternaryAlt: '#3d3d3d',
    neutralQuaternary: '#454545',
    neutralTertiaryAlt: '#6d6d6d',
    neutralTertiary: '#c8c8c8',
    neutralSecondary: '#d0d0d0',
    neutralPrimaryAlt: '#dadada',
    neutralPrimary: '#ffffff',
    neutralDark: '#f4f4f4',
    black: '#f8f8f8',
    white: '#1c1c1c',
  },
  fonts: {
    small: { fontFamily: 'Segoe UI, Arial, sans-serif' },
    medium: { fontFamily: 'Segoe UI, Arial, sans-serif' },
    large: { fontFamily: 'Segoe UI, Arial, sans-serif' },
  },
});

// Create a theme from a UI config object. Accepts partial values and falls back to defaults.
export function createThemeFromConfig(cfg?: { primaryColor?: string; fontFamily?: string }): Theme {
  const primary = cfg?.primaryColor || '#0078d4';
  const font = cfg?.fontFamily || 'Segoe UI, Arial, sans-serif';

  const base = createTheme({
    palette: {
      themePrimary: primary,
      themeLighterAlt: '#eff6fc',
      themeLighter: '#deecf9',
      themeLight: '#c7e0f4',
      themeTertiary: '#71afe5',
      themeSecondary: '#2b88d8',
      themeDarkAlt: '#106ebe',
      themeDark: '#005a9e',
      themeDarker: '#004578',
    },
    fonts: { small: { fontFamily: font }, medium: { fontFamily: font }, large: { fontFamily: font } },
  });

  return base;
}
