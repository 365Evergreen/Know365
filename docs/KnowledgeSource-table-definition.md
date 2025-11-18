# KnowledgeSource (Dataverse) — Table Definition

This document records the KnowledgeSource table schema used by Know365 for storing SharePoint source definitions. Keep this file as a reference for admin UI behavior, backfills, and Dataverse integration.

## Logical name 
- Typical logical name (solution prefix may vary): `e365_knowledgesource`

## Entity set name
- Entity Set Name is org-specific and may differ (e.g. `KnowledgeSources`, `e365_knowledgesources`, etc.).
- To determine the exact entity set name for your environment, query the metadata endpoint:

```
GET https://<your-org>.crmX.dynamics.com/api/data/v9.2/EntityDefinitions?$filter=LogicalName eq 'e365_knowledgesource'&$select=LogicalName,EntitySetName
```

## Core fields (display names)
- `SourceName` (string): Human-friendly name for the source (e.g., "HR Policies").
- `SharePointSiteUrl` (string): Optional fallback SharePoint site URL (e.g., `https://contoso.sharepoint.com/sites/hr`).
- `LibraryName` (string): Optional fallback library or list name in SharePoint (e.g., "Shared Documents" or "Policies").
- `GraphEndpoint` (string / JSON): Canonical Graph reference stored as JSON. Preferred shape:

```json
{
  "type": "drive" | "list",
  "siteId": "<site-id>",
  "driveId": "<drive-id>",
  "listId": "<list-id>"
}
```

Notes:
- `type` indicates whether the canonical reference points to a drive (document library) or a list.
- For `drive` entries include `siteId` + `driveId`.
- For `list` entries include `siteId` + `listId`.

## Recommended additional metadata
- `Owner` / `CreatedBy` / `ModifiedOn` — standard Dataverse audit fields.
- `IsActive` (boolean) — optional flag to soft-disable a source.

## Example payloads

Create payload (JSON) — ensure you use your org's field names or logical schema names if prefixed:

```json
{
  "SourceName": "HR Policies",
  "SharePointSiteUrl": "https://contoso.sharepoint.com/sites/hr",
  "LibraryName": "Shared Documents",
  "GraphEndpoint": "{\"type\":\"drive\",\"siteId\":\"site-id-here\",\"driveId\":\"drive-id-here\"}"
}
```

If your Dataverse schema uses different logical names (e.g., `e365_sourcename`) adapt the property names accordingly. The client code in `src/services/dataverseClient.ts` attempts to resolve the org's entity set (EntitySetName) and normalizes records to `SourceName`, `SharePointSiteUrl`, `LibraryName`, and `GraphEndpoint` for the UI.

## Troubleshooting notes
- If you see `Resource not found for the segment 'KnowledgeSources'` when POSTing, the org exposes a different `EntitySetName`. Use the metadata query above and update any mapping or allow the client to resolve the entity set.
- If Graph list enumeration returns empty for a site (permissions), the admin UI falls back to SharePoint REST `/_api/web/lists?$select=Title,Id`.

---
Generated: by assistant for repository reference.
