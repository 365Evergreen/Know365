import express from 'express';
import dotenv from 'dotenv';

const defaultEnvPath = process.env.DEV_PROXY_ENV_PATH || 'server/dev-proxy/.env';
const envResult = dotenv.config({ path: defaultEnvPath });
if (envResult.error) {
  console.warn(`DEV PROXY: Failed to load env from ${defaultEnvPath}: ${envResult.error}. Falling back to process.env.`);
} else {
  console.log(`DEV PROXY: Loaded env from ${defaultEnvPath}`);
}

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.DEV_PROXY_PORT || 4000;
const TENANT_ID = process.env.DEV_PROXY_TENANT_ID;
const CLIENT_ID = process.env.DEV_PROXY_CLIENT_ID;
const CLIENT_SECRET = process.env.DEV_PROXY_CLIENT_SECRET;
const PROXY_SECRET = process.env.DEV_PROXY_SECRET || 'dev-secret';

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
  console.warn('DEV PROXY: Missing DEV_PROXY_TENANT_ID / CLIENT_ID / CLIENT_SECRET in environment. Proxy will not acquire tokens.');
}

let cachedToken = null;

async function getAppToken() {
  if (cachedToken && cachedToken.expiresAt && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing client credentials for dev proxy.');
  }

  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const res = await fetch(url, { method: 'POST', body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to acquire token: ${res.status} ${text}`);
  }
  const json = await res.json();
  const expiresIn = json.expires_in || 3600;
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  console.log(`DEV PROXY: Acquired app token (expires in ${expiresIn} seconds)`);
  return cachedToken.token;
}

// Simple CORS for local dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-dev-proxy-secret');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Proxy endpoint: POST /api/graph
// Body: { method, path, query, body }
app.post('/api/graph', async (req, res) => {
  try {
    const secret = req.headers['x-dev-proxy-secret'];
    if (PROXY_SECRET && secret !== PROXY_SECRET) {
      return res.status(401).json({ error: 'Invalid dev proxy secret' });
    }

    const { method = 'GET', path = '/', query = '', body: reqBody } = req.body || {};
    if (!path || typeof path !== 'string') return res.status(400).json({ error: 'Missing path' });

    const token = await getAppToken();

    const url = `https://graph.microsoft.com/v1.0${path}${query ? (query.startsWith('?') ? query : '?' + query) : ''}`;
    const options = { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
    if (reqBody && (method === 'POST' || method === 'PATCH' || method === 'PUT')) options.body = JSON.stringify(reqBody);

    const upstream = await fetch(url, options);
    const contentType = upstream.headers.get('content-type') || '';
    const status = upstream.status;

    if (contentType.includes('application/json')) {
      const json = await upstream.json();
      return res.status(status).json(json);
    }
    const text = await upstream.text();
    res.status(status).send(text);
  } catch (err) {
    console.error('Dev proxy error:', err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Dev proxy listening on http://localhost:${PORT}`);
});
