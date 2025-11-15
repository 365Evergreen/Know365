Migration helper: upload assets (blob) -> create Dataverse metadata

Overview
- This document shows how to use `scripts/migrateBlobsToDataverse.js` to migrate blob metadata into your Dataverse table `e365_knowledgecentreconfigurations`.

Prerequisites
- Node 18+ and `pnpm`/`npm` available (script uses `axios` and `@azure/storage-blob`).
- Environment variables configured (see below).
- The Dataverse table `e365_knowledgecentreconfigurations` must exist and contain the columns you plan to write (e.g., `e365_name`, `e365_asseturl`, `e365_contenttype`, `e365_filesize`).

Install

```pwsh
cd c:\Users\Pauli\know-365\ReactDev
pnpm add axios @azure/storage-blob
# or npm: npm install axios @azure/storage-blob
```

Environment variables
- `STORAGE_CONNECTION_STRING` - preferred (or `AZURE_STORAGE_ACCOUNT` + `AZURE_STORAGE_KEY`)
- `CONTAINER_NAME` - e.g. `assets`
- `DYNAMICS_URL` - e.g. `https://orgefecd8a9.crm6.dynamics.com`
- `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET` - for an AAD app with permission to call Dataverse (client credentials)
- (optional) `GENERATE_SAS=true` - generate a read SAS for each blob if container is private
- (optional) `SAS_DURATION_MINUTES` - SAS validity in minutes (defaults to 10080 = 7 days)

Quick run (PowerShell)

```pwsh
$env:STORAGE_CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
$env:CONTAINER_NAME = "assets"
$env:DYNAMICS_URL = "https://orgefecd8a9.crm6.dynamics.com"
$env:TENANT_ID = "<tenant>"
$env:CLIENT_ID = "<client>"
$env:CLIENT_SECRET = "<secret>"
# optional: $env:GENERATE_SAS = 'true'
node .\scripts\migrateBlobsToDataverse.js
```

PowerShell example (list blobs and create Dataverse records)

```powershell
# requires Az.Storage module and an app registration for Dataverse OAuth
Connect-AzAccount
$rg = 'myResourceGroup'
$storageAccount = 'blobknow365'
$container = 'assets'
$ctx = (Get-AzStorageAccount -ResourceGroupName $rg -Name $storageAccount).Context
$blobs = Get-AzStorageBlob -Container $container -Context $ctx

# Acquire Dataverse token (client credentials)
$tenantId = '<tenant>'
$clientId = '<client>'
$clientSecret = '<secret>'
$dynUrl = 'https://orgefecd8a9.crm6.dynamics.com'
$body = @{client_id=$clientId;scope="$($dynUrl)/.default";client_secret=$clientSecret;grant_type='client_credentials'}
$tokenRes = Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" -Body $body
$token = $tokenRes.access_token

foreach ($b in $blobs) {
  $blobUrl = "https://$storageAccount.blob.core.windows.net/$container/$($b.Name)"
  $payload = @{ e365_name = $b.Name; e365_asseturl = $blobUrl; e365_contenttype = $b.ICloudBlob.Properties.ContentType; e365_filesize = $b.ICloudBlob.Properties.Length }
  $json = $payload | ConvertTo-Json -Depth 5
  Invoke-RestMethod -Method Post -Uri "$dynUrl/api/data/v9.2/e365_knowledgecentreconfigurations" -Body $json -Headers @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
}
```

Notes & next steps
- Make sure the Dataverse table has the exact attribute logical names used in the payload. If your fields differ, update `buildPayload` in the Node script.
- For production, consider an Azure Function to handle uploads so files are written to Blob Storage and a Dataverse record is created atomically.
- Consider using Azure CDN to front public assets and save the CDN URL in Dataverse as `assetUrl`.
- Test with a few blobs first; verify created records in Dataverse Web API or via the model-driven UI.

If you want, I can:
- scaffold an Azure Function upload endpoint that writes to Blob Storage and inserts Dataverse metadata,
- or update the script to support parallel uploads, thumbnail generation, or custom field mappings.
