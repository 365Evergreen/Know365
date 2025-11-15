import { registerIcons } from '@fluentui/react';

// Lightweight SVG icons used by the CommandBar. These are small inline SVGs
// registered with Fluent UI so the <Icon iconName="..." /> component can
// render them as SVGs instead of relying on an icon font.
export function registerSvgIcons() {
  registerIcons({
    icons: {
      Home: `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M12 3l9 8h-3v9h-12v-9h-3l9-8z" />
        </svg>
      `,
      Documentation: `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM14 3v5h5" />
        </svg>
      `,
      Search: `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM10 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
        </svg>
      `,
      Settings: `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94s-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.11-0.2-0.35-0.28-0.57-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.5,2.5c-0.03-0.22-0.22-0.38-0.44-0.38h-3.12c-0.22,0-0.41,0.16-0.44,0.38L9.39,4.16c-0.59,0.24-1.12,0.56-1.62,0.94L5.38,4.14c-0.22-0.09-0.46,0.02-0.57,0.22L2.89,7.68c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58c-0.04,0.3-0.06,0.61-0.06,0.94s0.02,0.64,0.06,0.94L3.02,14.33c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.11,0.2,0.35,0.28,0.57,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.51,1.66c0.03,0.22,0.22,0.38,0.44,0.38h3.12c0.22,0,0.41-0.16,0.44-0.38l0.51-1.66c0.59-0.24,1.12-0.56,1.62-0.94l2.39,0.96c0.22,0.09,0.46-0.02,0.57-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.5c-1.93,0-3.5-1.57-3.5-3.5s1.57-3.5,3.5-3.5s3.5,1.57,3.5,3.5S13.93,15.5,12,15.5z" />
        </svg>
      `,
      Database: `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm0 2c3.87 0 7 1.34 7 3s-3.13 3-7 3-7-1.34-7-3 3.13-3 7-3zm0 14c-3.87 0-7-1.34-7-3v-1.1c1.66 1.07 4.29 1.7 7 1.7s5.34-0.63 7-1.7V16c0 1.66-3.13 3-7 3z" />
        </svg>
      `,
    },
  });
}

// Call automatically if module is imported
registerSvgIcons();

export default registerSvgIcons;
