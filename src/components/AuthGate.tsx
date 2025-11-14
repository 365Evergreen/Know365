import React, { useEffect, useState } from 'react';
import { msalInstance, loginRequest } from '../services/authConfig';

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // process any redirect response if present
        try {
          const handleResult = await msalInstance.handleRedirectPromise();
          if (handleResult && handleResult.account) {
            msalInstance.setActiveAccount(handleResult.account);
            // store a login hint (email / username) for future silent SSO attempts
            try {
              const hint = handleResult.account.username || handleResult.account?.name;
              if (hint) localStorage.setItem('msal:lastLoginHint', hint);
            } catch {}
          }
        } catch (e) {
          console.debug('handleRedirectPromise error', e);
        }

        // If MSAL already has accounts (user previously signed in), set active account
        const accounts = msalInstance.getAllAccounts();
        if (accounts && accounts.length > 0) {
          msalInstance.setActiveAccount(accounts[0]);
          try {
            await msalInstance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
          } catch (err) {
            console.debug('acquireTokenSilent failed for cached account', err);
            // Try ssoSilent as a secondary attempt
            try {
              await msalInstance.ssoSilent({ scopes: loginRequest.scopes });
            } catch (ssoErr) {
              console.debug('ssoSilent failed', ssoErr);
            }
          }
        } else {
          // No cached account — attempt single sign-on silently
          try {
            // try ssoSilent with a stored login hint to increase success in multi-account browsers
            const loginHint = localStorage.getItem('msal:lastLoginHint') || undefined;
            const sso = await msalInstance.ssoSilent({ scopes: loginRequest.scopes, loginHint });
            if (sso && sso.account) {
              msalInstance.setActiveAccount(sso.account);
              try {
                const hint = sso.account.username || sso.account?.name;
                if (hint) localStorage.setItem('msal:lastLoginHint', hint);
              } catch {}
            }
          } catch (ssoErr) {
            console.debug('silent SSO not available', ssoErr);

            // If silent SSO failed and we haven't redirected this session, force an interactive redirect.
            // Use a session flag to avoid redirect loops.
            try {
              const redirected = sessionStorage.getItem('msal:redirectAttempted');
              if (!redirected) {
                sessionStorage.setItem('msal:redirectAttempted', '1');
                await msalInstance.loginRedirect(loginRequest);
                // loginRedirect will navigate away; code below won't execute immediately.
              }
            } catch (redirectErr) {
              console.debug('loginRedirect failed or was blocked', redirectErr);
            }
          }
        }
      } catch (e) {
        console.error('Auth init error', e);
      } finally {
        if (mounted) setInitializing(false);
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  if (initializing) {
    return <div style={{ padding: 24 }}>Checking sign-in status…</div>;
  }

  return <>{children}</>;
};

export default AuthGate;
