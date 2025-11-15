#!/usr/bin/env node
/*
  upload-icons.js

  Usage:
    # create a .env file or set these env vars in your shell
    AZURE_STORAGE_CONNECTION_STRING="..."
    AZURE_STORAGE_CONTAINER=site-ui-assets
    ICONS_FOLDER=./fluentui-system-icons
    DATAVERSE_API=https://<org>.api.crm.dynamics.com/api/data/v9.2
    DATAVERSE_ENTITY_SET=Icons
    DATAVERSE_FIELD_NAME=name
    DATAVERSE_FIELD_URL=fileUrl
    DATAVERSE_TOKEN="Bearer <token>"

  Then run:
    node scripts/upload-icons.js

  The script uploads all .svg files under ICONS_FOLDER to the configured container
  and (optionally) creates a Dataverse record per file. If DATAVERSE_TOKEN is not
  provided, the script will only upload blobs and emit a JSON mapping file.

  Notes:
  - The script is intentionally simple and parameterized to work in your environment.
  - For production use, prefer to generate short-lived SAS URLs on a secure server
    instead of embedding long-lived tokens.
*/

import { BlobServiceClient } from '@azure/storage-blob';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const AZURE_CONN = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER = process.env.AZURE_STORAGE_CONTAINER || 'site-ui-assets';
const ICONS_FOLDER = process.env.ICONS_FOLDER || './icons-to-upload';
const DATAVERSE_API = process.env.DATAVERSE_API; // e.g. https://org.api.crm.dynamics.com/api/data/v9.2
const DATAVERSE_ENTITY_SET = process.env.DATAVERSE_ENTITY_SET || 'Icons';
const DATAVERSE_FIELD_NAME = process.env.DATAVERSE_FIELD_NAME || 'name';
const DATAVERSE_FIELD_URL = process.env.DATAVERSE_FIELD_URL || 'fileUrl';
const DATAVERSE_TOKEN = process.env.DATAVERSE_TOKEN; // Bearer token

if (!AZURE_CONN) {
  console.error('AZURE_STORAGE_CONNECTION_STRING is required');
  process.exit(1);
}

async function findSvgs(dir) {
  const results = [];
  async function walk(d) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile() && full.toLowerCase().endsWith('.svg')) {
        results.push(full);
      }
    }
  }
  await walk(dir);
  return results;
}

async function upload() {
  const blobService = BlobServiceClient.fromConnectionString(AZURE_CONN);
  const containerClient = blobService.getContainerClient(CONTAINER);
  await containerClient.createIfNotExists({ access: 'container' });

  // Ensure icons folder exists
  try {
    await fs.access(ICONS_FOLDER);
  } catch (e) {
    console.error(`Icons folder not found: ${ICONS_FOLDER}`);
    process.exit(1);
  }

  const files = await findSvgs(ICONS_FOLDER);
  console.log(`Found ${files.length} SVG files in ${ICONS_FOLDER}`);

  const mapping = [];

  for (const f of files) {
    try {
      const basename = path.basename(f);
      // Use folder structure in blob name to avoid collisions
      const relative = path.relative(ICONS_FOLDER, f).replace(/\\/g, '/');
      const blobName = `icons/${relative}`;
      const blockClient = containerClient.getBlockBlobClient(blobName);

      const content = await fs.readFile(f);

      await blockClient.uploadData(content, {
        blobHTTPHeaders: {
          blobContentType: 'image/svg+xml',
          blobCacheControl: 'public, max-age=31536000, immutable',
        },
      });

      const blobUrl = blockClient.url;
      console.log(`Uploaded: ${relative} -> ${blobUrl}`);

      const record = { localPath: relative, blobUrl };

      if (DATAVERSE_API && DATAVERSE_TOKEN) {
        const payload = {
          [DATAVERSE_FIELD_NAME]: path.parse(basename).name,
          [DATAVERSE_FIELD_URL]: blobUrl,
        };

        try {
          const res = await axios.post(`${DATAVERSE_API}/${DATAVERSE_ENTITY_SET}`, payload, {
            headers: {
              Authorization: DATAVERSE_TOKEN.startsWith('Bearer') ? DATAVERSE_TOKEN : `Bearer ${DATAVERSE_TOKEN}`,
              'OData-MaxVersion': '4.0',
              'OData-Version': '4.0',
              Accept: 'application/json',
              'Content-Type': 'application/json; charset=utf-8',
            },
          });
          // Dataverse returns a location header or OData-EntityId in some cases
          const createdId = res.headers['odata-entityid'] || res.headers['location'] || null;
          record.dataverse = { status: 'created', id: createdId };
          console.log(`Dataverse record created for ${basename}`);
        } catch (e) {
          console.warn(`Dataverse create failed for ${basename}:`, e.message || e);
          record.dataverse = { status: 'error', error: String(e?.message || e) };
        }
      }

      mapping.push(record);
    } catch (err) {
      console.error('Upload error for', f, err);
    }
  }

  // Write mapping
  await fs.writeFile('upload-icons-result.json', JSON.stringify(mapping, null, 2), 'utf8');
  console.log('Wrote upload-icons-result.json');
}

upload().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
