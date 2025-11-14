import { PublicClientApplication, Configuration } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
  },
  cache: {
    // Use localStorage so authenticated state persists across tabs/windows.
    // This improves silent SSO behavior for users already signed into M365 in the browser.
    cacheLocation: 'localStorage',
    // storeAuthStateInCookie helps with certain browsers and scenarios (SWA, older browsers)
    storeAuthStateInCookie: true,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest = {
  scopes: ['User.Read', 'Sites.Read.All'],
};

export const graphScopes = {
  scopes: import.meta.env.VITE_GRAPH_SCOPES?.split(',') || ['Sites.Read.All', 'User.Read'],
};
