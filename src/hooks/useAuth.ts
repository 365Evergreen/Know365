import { InteractionRequiredAuthError, AuthenticationResult } from '@azure/msal-browser';
import { msalInstance } from '../services/authConfig';

export default function useAuth() {
  const getActiveAccount = () => msalInstance.getActiveAccount() ?? null;

  const isAuthenticated = () => {
    return msalInstance.getAllAccounts().length > 0;
  };

  const login = async () => {
    // prefer redirect for production robustness
    await msalInstance.loginRedirect();
  };

  const logout = async () => {
    await msalInstance.logoutRedirect();
  };

  const acquireToken = async (scopes: string[]): Promise<AuthenticationResult | null> => {
    const account = getActiveAccount();
    try {
      if (account) {
        return await msalInstance.acquireTokenSilent({ scopes, account });
      }
      // no active account — try ssoSilent
      try {
        const sso = await msalInstance.ssoSilent({ scopes });
        if (sso && sso.account) {
          msalInstance.setActiveAccount(sso.account);
          return await msalInstance.acquireTokenSilent({ scopes, account: sso.account });
        }
      } catch (ssoErr) {
        console.debug('ssoSilent failed in acquireToken', ssoErr);
      }

      // last resort: try popup to get token without redirect if allowed
      try {
        return await msalInstance.acquireTokenPopup({ scopes });
      } catch (popupErr) {
        // fallback to redirect which will navigate away
        if (popupErr instanceof InteractionRequiredAuthError) {
          await msalInstance.acquireTokenRedirect({ scopes });
          return null;
        }
        throw popupErr;
      }
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        // try redirect fallback
        await msalInstance.acquireTokenRedirect({ scopes });
        return null;
      }
      throw err;
    }
  };

  return {
    getActiveAccount,
    isAuthenticated,
    login,
    logout,
    acquireToken,
  } as const;
}
