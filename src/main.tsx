import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { msalInstance } from './services/authConfig';

// Initialize MSAL before mounting the app to prevent "uninitialized_public_client_application" errors
async function bootstrap() {
  try {
    if (typeof msalInstance.initialize === 'function') {
      // initialize returns a Promise in newer msal-browser versions
      // await it so the instance is ready before other code calls MSAL APIs
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await msalInstance.initialize();
    }
  } catch (e) {
    // initialization may not be necessary in older msal versions; log and continue
    // eslint-disable-next-line no-console
    console.debug('msal initialize skipped or failed', e);
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
