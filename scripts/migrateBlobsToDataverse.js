/*
  migrateBlobsToDataverse.js

  Node script to list blobs in an Azure Blob container and create Dataverse records
  for each blob in the `e365_knowledgecentreconfigurations` table.

  Requirements (env vars):
    - STORAGE_CONNECTION_STRING  OR (AZURE_STORAGE_ACCOUNT + AZURE_STORAGE_KEY)
    - CONTAINER_NAME
    - DYNAMICS_URL              e.g. https://orgefecd8a9.crm6.dynamics.com
    - TENANT_ID
    - CLIENT_ID                 (for Dataverse client credentials)
    - CLIENT_SECRET
    - GENERATE_SAS (optional, 'true' to generate short-lived SAS for asset URLs)
    - SAS_DURATION_MINUTES (optional, default 60*24*7 = 7 days)

  Usage:
    node scripts/migrateBlobsToDataverse.js

  Notes:
    - Adjust the Dataverse field names in `buildPayload` to match your table schema.
    - The script checks for an existing record with the same asset URL before creating.
*/

const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');
const axios = require('axios');

const STORAGE_CONNECTION_STRING = process.env.STORAGE_CONNECTION_STRING || '';
const AZURE_STORAGE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT || '';
const AZURE_STORAGE_KEY = process.env.AZURE_STORAGE_KEY || '';
const CONTAINER_NAME = process.env.CONTAINER_NAME || 'assets';
const DYNAMICS_URL = process.env.DYNAMICS_URL || ''; // e.g. https://orgefecd8a9.crm6.dynamics.com
const TENANT_ID = process.env.TENANT_ID || '';
const CLIENT_ID = process.env.CLIENT_ID || '';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const GENERATE_SAS = (process.env.GENERATE_SAS || 'false').toLowerCase() === 'true';
const SAS_DURATION_MINUTES = parseInt(process.env.SAS_DURATION_MINUTES || String(60 * 24 * 7), 10);

if (!DYNAMICS_URL || !TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing required Dataverse credentials: set DYNAMICS_URL, TENANT_ID, CLIENT_ID, CLIENT_SECRET');
  process.exit(1);
}

async function getDataverseToken() {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  params.append('scope', `${DYNAMICS_URL}/.default`);
  params.append('grant_type', 'client_credentials');

  const res = await axios.post(url, params);
  return res.data.access_token;
}

function parseAccountFromConnectionString(cs) {
  // crude parser to extract AccountName and AccountKey
  const parts = cs.split(';');
  const map = {};
  parts.forEach(p => {
    const [k, v] = p.split('=');
    if (k && v) map[k.toLowerCase()] = v;
  });
  return { accountName: map['accountname'], accountKey: map['accountkey'] };
}

function makePublicBlobUrl(accountName, containerName, blobName, sasToken) {
  const base = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeURIComponent(blobName)}`;
  return sasToken ? `${base}?${sasToken}` : base;
}

async function generateSasForBlob(accountName, accountKey, containerName, blobName, minutes) {
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const startsOn = new Date();
  const expiresOn = new Date(Date.now() + minutes * 60 * 1000);

  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      startsOn,
      expiresOn,
    },
    credential
  ).toString();

  return sas;
}

async function listAndMigrate() {
  let blobServiceClient;
  if (STORAGE_CONNECTION_STRING) {
    blobServiceClient = BlobServiceClient.fromConnectionString(STORAGE_CONNECTION_STRING);
  } else if (AZURE_STORAGE_ACCOUNT && AZURE_STORAGE_KEY) {
    const conn = `DefaultEndpointsProtocol=https;AccountName=${AZURE_STORAGE_ACCOUNT};AccountKey=${AZURE_STORAGE_KEY};EndpointSuffix=core.windows.net`;
    blobServiceClient = BlobServiceClient.fromConnectionString(conn);
  } else {
    console.error('Provide STORAGE_CONNECTION_STRING OR AZURE_STORAGE_ACCOUNT+AZURE_STORAGE_KEY');
    process.exit(1);
  }

  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  const accountName = AZURE_STORAGE_ACCOUNT || (STORAGE_CONNECTION_STRING ? parseAccountFromConnectionString(STORAGE_CONNECTION_STRING).accountName : '');

  const token = await getDataverseToken();
  console.log('Obtained Dataverse token (hidden) — starting to iterate blobs...');

  for await (const blob of containerClient.listBlobsFlat()) {
    try {
      const blobClient = containerClient.getBlobClient(blob.name);
      const props = await blobClient.getProperties();

      let assetUrl = makePublicBlobUrl(accountName, CONTAINER_NAME, blob.name, null);

      if (GENERATE_SAS) {
        const accountKey = AZURE_STORAGE_KEY || parseAccountFromConnectionString(STORAGE_CONNECTION_STRING).accountKey;
        if (!accountKey) {
          console.warn('Cannot generate SAS: missing account key. Falling back to public URL.');
        } else {
          const sas = await generateSasForBlob(accountName, accountKey, CONTAINER_NAME, blob.name, SAS_DURATION_MINUTES);
          assetUrl = makePublicBlobUrl(accountName, CONTAINER_NAME, blob.name, sas);
        }
      }

      // OPTIONAL: Check if a Dataverse record already exists for this assetUrl
      const filter = `e365_asseturl eq '${assetUrl.replace("'", "''")}'`;
      const queryUrl = `${DYNAMICS_URL}/api/data/v9.2/e365_knowledgecentreconfigurations?$filter=${encodeURIComponent(filter)}`;
      const existing = await axios.get(queryUrl, { headers: { Authorization: `Bearer ${token}` } });

      if (existing.data && existing.data.value && existing.data.value.length > 0) {
        console.log(`Skipping existing record for ${blob.name}`);
        continue;
      }

      const payload = buildPayload(blob.name, assetUrl, props);

      const createUrl = `${DYNAMICS_URL}/api/data/v9.2/e365_knowledgecentreconfigurations`;
      const createRes = await axios.post(createUrl, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Content-Type': 'application/json; charset=utf-8',
        },
      });

      if (createRes.status === 201 || createRes.status === 204) {
        console.log(`Created Dataverse record for ${blob.name}`);
      } else {
        console.log(`Unexpected response for ${blob.name}: ${createRes.status}`);
      }

    } catch (err) {
      console.error('Error processing blob', blob.name, err.response ? err.response.data : err.message);
    }
  }
}

function buildPayload(blobName, assetUrl, props) {
  // Adjust these attribute names to match your Dataverse table fields.
  return {
    "e365_name": blobName,
    "e365_asseturl": assetUrl,
    "e365_contenttype": props.contentType || null,
    "e365_filesize": props.contentLength || null,
    // optional fields you may want to create in the table
    // "e365_thumbnailurl": thumbnailUrl,
    // "e365_tags": "imported",
    // "e365_visibility": "public",
  };
}

listAndMigrate().then(() => console.log('Done')).catch(err => { console.error(err); process.exit(1); });
