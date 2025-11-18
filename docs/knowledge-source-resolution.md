## KnowledgeSource → SharePoint retrieval: step-by-step

This document describes the runtime flow and troubleshooting steps used by the Know365 frontend to find and surface SharePoint items that are referenced by Dataverse `KnowledgeSource` records. It explains the common failure modes (blockers) and recommended fixes.

**Where the code lives**
- Dataverse helpers: `src/services/dataverseClient.ts`
- SharePoint helpers (Graph + REST fallback): `src/services/sharePointGraph.ts`
- Page that shows function-scoped documents: `src/pages/FunctionsPage.tsx`
- Test page (Communications): `src/pages/CommunicationsTest.tsx`
- Display component: `src/components/DocumentsDisplay.tsx`

---

**Overview (what we want to achieve)**
- For a given business function (e.g. "Communications", "Finance"), show all knowledge articles stored in SharePoint that are associated with `KnowledgeSource` records in Dataverse.
- KnowledgeSource records may refer to drives (document libraries) or lists (List-backed knowledge articles). The app must resolve the site and the library/list and then fetch items via Microsoft Graph (or SharePoint REST fallback when necessary).

---

1) Fetch KnowledgeSource records from Dataverse
- Function: `getKnowledgeSources()` / `getKnowledgeSourcesFromOrg()` in `dataverseClient.ts`.
- Expected useful fields on a KnowledgeSource row:
  - `e365_sharepointsiteurl` (or similarly named field) — absolute site URL (preferred)
  - `e365_sharepointsiteurl` (or similarly named field) — absolute site URL (preferred)
  - `e365_sourceinternalname` — internal name/path for the source (this org uses `e365_sourceinternalname` rather than `e365_libraryname`)
  - `GraphEndpoint` or equivalent JSON — a canonical Graph reference (site / drive / list endpoint)
  - `e365_knowledgesourcetext` — a free-text mirror of the business function (recommended to preferentially use)
  - business function lookup (may be a lookup GUID to another table)

2) Normalize business function mapping
- The UI prefers `e365_knowledgesourcetext` when present because lookup columns can be stored as GUIDs or vary between orgs.
- If `e365_knowledgesourcetext` is empty, the code falls back to resolving the lookup value (which requires an expanded fetch in Dataverse).

3) Derive site URL and library/list name
- The code uses `deriveSiteAndLibrary()` (in `dataverseClient.ts`) to synthesize candidate values if canonical fields are missing. It examines fields such as `SharePointSiteUrl`, `LibraryName`, raw URLs, and `GraphEndpoint`.
- If both site and library cannot be derived, the KnowledgeSource may be skipped unless a fallback probe finds items.

4) Resolve site & library on SharePoint side
- Primary path: use Microsoft Graph to find the site (`/sites/root:/sites/<sitePath>`) and then find the drive or list by displayName.
- For document libraries (drives): call Graph to get the driveId and then list contents.
- For SharePoint lists (List-backed KB): the UI calls `listLibraryItems()` which includes fuzzy matching and a final probe that enumerates lists on the site when displayName-to-id resolution fails.

5) Fetch items and map to display model
- Helper `mapSharePointDocsToDisplayItems()` converts Graph/list item payloads into the UI model (title, excerpt, webUrl, source, raw payload).

6) Surface items in UI
- Functions page and `CommunicationsTest` page display title + excerpt cards via `DocumentsDisplay`.

---

Common blockers and how to address them

- Missing or null `SharePointSiteUrl` and/or `LibraryName`
 - Missing or null `SharePointSiteUrl` and/or source/list identifier
  - Symptom: The code logs "Skipping KnowledgeSource with invalid SharePointSiteUrl or LibraryName" and you see zero items for a function even though the list exists in SharePoint.
  - Why: many orgs have inconsistent custom field names or left these fields empty.
  - Fixes:
    - Populate `e365_sharepointsiteurl` and/or `e365_sourceinternalname` (or the equivalent field in your org) for the KnowledgeSource row in Dataverse.
    - Or populate `GraphEndpoint` with a canonical Graph JSON reference to the site/list/drive.
    - Short-term: rely on `deriveSiteAndLibrary()` (already present) plus the probing fallback in `sharePointGraph.listLibraryItems`.

- Business function stored only as a lookup GUID (not expanded)
  - Symptom: When filtering by business function you don’t match the expected rows; `e365_knowledgesourcetext` is empty.
  - Why: Dataverse lookup columns may store only the GUID and require an $expand when fetched.
  - Fixes:
    - Best: add a text mirror field `e365_knowledgesourcetext` and copy the lookup display name into it (one-time migration). The frontend already prefers this field.
    - Alternate: modify server/client fetch to expand the lookup and read the related name (adds complexity and extra Graph/Dataverse calls).

- List vs Drive mismatch (LibraryName exists but it's a List)
  - Symptom: Errors like "Library 'KnowledgeBase' not found in site" or "Failed to get drive ID for library".
  - Why: code initially attempts drive (document library) lookup first; some KnowledgeBase content is stored in SharePoint lists (Lists/KnowledgeBase).
  - Fixes:
    - Ensure KnowledgeSource records indicate whether SourceType = list vs library, or include GraphEndpoint.
    - The code includes a fallback that enumerates site lists and looks for matching displayName — increase logging to see probe results.

- Typographical differences in businessFunction names
  - Symptom: records exist but function-matching misses because of typos (e.g., "Senior managment").
  - Fixes:
    - Normalize names (lowercase/trim) and consider fuzzy substring matching when mapping KnowledgeSource -> function.
    - Backfill `e365_knowledgesourcetext` with normalized values.

- Permissions / Authentication errors
  - Symptom: Graph calls return 401/403 or token acquisition fails.
  - Why: frontend requires MSAL token scopes and the user must consent to Graph scopes; CI/deploy may use app-only flows requiring proper Azure registration and secrets.
  - Fixes:
    - Confirm the app registration and MSAL configuration (`src/services/authConfig.ts`) have correct clientId/tenant, and that users have consented to scopes.
    - For server-side tasks, prefer an app-only token (with appropriate Graph permissions) and store securely.

- Rate limits / 429 from Graph
  - Symptom: intermittent failures fetching lists or drives.
  - Fixes:
    - Add retry with exponential backoff (Graph SDK has helpers), cache results where possible, and batch requests.

- CORS or environment preview limits
  - Symptom: Local `npm run preview` shows header but dataverse/graph calls fail because token flow requires redirect URIs or cannot run in preview.
  - Fixes:
    - Use the dev-proxy (`server/dev-proxy`) for local testing, or run the app inside a context where auth redirect URIs are configured.

---

Quick troubleshooting checklist (order to try)
1. Use the `Dataverse Debug` page (`/dataverse-debug`) to inspect raw KnowledgeSource rows and confirm fields like `e365_sharepointsiteurl`, `LibraryName`, `GraphEndpoint`, and `e365_knowledgesourcetext`.
1. Use the `Dataverse Debug` page (`/dataverse-debug`) to inspect raw KnowledgeSource rows and confirm fields like `e365_sharepointsiteurl`, `e365_sourceinternalname` (or your org's source identifier), `GraphEndpoint`, and `e365_knowledgesourcetext`.
2. If `e365_knowledgesourcetext` is empty, consider backfilling it from the lookup display name.
3. Verify the site URL in a browser and confirm the library/list name matches exactly (display names can differ from internal ids).
4. On the app host, enable verbose console logging for `dataverseClient` and `sharePointGraph` to see derived values and probe steps.
5. If Graph 401/403 occurs, check MSAL login and required scopes; test token acquisition separately.

---

Recommended short-term fixes (practical)
- Backfill `e365_knowledgesourcetext` for the organisation's KnowledgeSource rows from the lookup display names.
- Populate `SharePointSiteUrl` and `LibraryName` (or `GraphEndpoint`) where possible for list-backed sources.
- Add one-off admin script (PowerShell or Node) to scan KnowledgeSource rows and report rows missing site/library and propose values using the Dataverse Debug output.

---

Examples & useful commands
- Dataverse OData (example) — fetch KnowledgeSources including a lookup expand (replace env values):
```pwsh
curl -H "Authorization: Bearer <token>" \
  "https://<org>.api.crm.dynamics.com/api/data/v9.2/e365_knowledgesources?$select=sourceid,e365_sharepointsiteurl,e365_knowledgesourcetext,libraryname&$expand=e365_businessfunction($select=name)"
```
- Graph: list site lists (example):
```http
GET https://graph.microsoft.com/v1.0/sites/{site-id}/lists
Authorization: Bearer <token>
```

---

If you want, I can:
- Add a small Node/PowerShell backfill script and include it in `scripts/` to copy the lookup display name into `e365_knowledgesourcetext` for all KnowledgeSource rows.
- Add extra diagnostic output to the `FunctionsPage` and `DataverseDebug` render so an admin can see derived `siteUrl` and `libraryName` per KnowledgeSource.

---

File created: `docs/knowledge-source-resolution.md`
