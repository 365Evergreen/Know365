import dotenv from 'dotenv';
import { URLSearchParams } from 'url';

const env = dotenv.config({ path: 'server/dev-proxy/.env' });
if (env.error) {
  console.error('Failed to load .env:', env.error);
  process.exit(1);
}
const TENANT = process.env.DEV_PROXY_TENANT_ID;
const CLIENT_ID = process.env.DEV_PROXY_CLIENT_ID;
const CLIENT_SECRET = process.env.DEV_PROXY_CLIENT_SECRET;
if (!TENANT || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing required env values');
  process.exit(1);
}
(async ()=>{
  try{
    const url = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
    const body = new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' });
    const res = await fetch(url, { method: 'POST', body });
    const txt = await res.text();
    if (!res.ok) {
      console.error('Token endpoint returned error:', res.status, txt);
      process.exit(2);
    }
    const json = JSON.parse(txt);
    console.log('Token acquired: OK');
    console.log('Access token length:', (json.access_token || '').length);
  } catch(e){
    console.error('Token request failed:', e);
    process.exit(3);
  }
})();
