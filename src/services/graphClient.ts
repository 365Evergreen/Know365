import { Client } from '@microsoft/microsoft-graph-client';
import { msalInstance } from './authConfig';

export const getGraphClient = (accessToken: string): Client => {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
};

export const getAccessToken = async (): Promise<string> => {
  const accounts = msalInstance.getAllAccounts();
  
  if (accounts.length === 0) {
    throw new Error('No accounts found. Please sign in.');
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes: ['Sites.Read.All', 'User.Read'],
      account: accounts[0],
    });
    return response.accessToken;
  } catch (error) {
    console.error('Silent token acquisition failed:', error);
    // Fallback to interactive login
    const response = await msalInstance.acquireTokenPopup({
      scopes: ['Sites.Read.All', 'User.Read'],
    });
    return response.accessToken;
  }
};

export const getUserProfile = async (accessToken: string) => {
  const client = getGraphClient(accessToken);
  return await client.api('/me').get();
};
