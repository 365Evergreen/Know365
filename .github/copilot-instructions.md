# Knowledge Centre - AI Agent Instructions

## Project Overview

This is a Microsoft 365-integrated knowledge management application with a React frontend designed for deployment as an Azure Static Web App. The solution centralizes organizational knowledge by integrating with SharePoint, OneDrive, Teams, and Power Platform (Dataverse, Power Automate).

## Tech Stack & Tools

- **Frontend**: React + TypeScript, Vite build system
- **UI Framework**: Fluent UI (Microsoft design system)
- **Authentication**: MSAL.js (Azure AD integration)
- **Package Manager**: **pnpm** (not npm/yarn - always use `pnpm` commands)
- **Backend Integration**: Microsoft Graph API, Dataverse Web API
- **Deployment**: Azure Static Web Apps with GitHub Actions

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (Vite)
pnpm build            # Production build (outputs to dist/)
pnpm preview          # Preview production build
```

## Architecture Patterns

### Component Structure
Follow this established hierarchy (see README for examples):
```
src/
├── App.tsx              # Root with ThemeProvider
├── main.tsx
├── components/          # Reusable UI components
│   ├── Header.tsx       # CommandBar with search & persona
│   ├── Hero.tsx         # Landing section
│   ├── ContentTabs.tsx  # Pivot-based content views
│   └── Footer.tsx
├── pages/               # Route-level components
├── services/            # API integration layer
│   ├── graphClient.ts   # Microsoft Graph setup
│   ├── dataverseClient.ts
│   └── sharePointGraph.ts
├── styles/
│   └── global.css
└── theme.ts             # Light/dark theme definitions
```

### Theme Management
- Always wrap app root with `<ThemeProvider>` from `@fluentui/react`
- Use `lightTheme` and `darkTheme` from `src/theme.ts`
- Theme toggle state managed in `App.tsx`

### Microsoft Graph Integration
- **Dynamic Source Discovery**: SharePoint sources configured in Dataverse table `KnowledgeSources`
- **Resolution Flow**: Fetch sources from Dataverse → resolve siteId/driveId → fetch documents
- Required Graph API scopes: `Sites.Read.All`
- Use `acquireTokenSilent()` for auth tokens before Graph calls

### Dataverse Configuration Table
When implementing knowledge source management:
- Table: `KnowledgeSources`
- Key columns: `SourceName`, `SharePointSiteUrl`, `LibraryName`, `GraphEndpoint`
- Access via `${VITE_DATAVERSE_API}/KnowledgeSources` endpoint

## UI/UX Standards

### Accessibility Requirements
- Use `aria-label` on navigation elements and search boxes
- Maintain WCAG 2.1 AA color contrast
- Fluent UI components provide keyboard navigation by default
- Add explicit `role` attributes for semantic sections

### Responsive Design
- Use Fluent UI `<Stack>` with `wrap` and `horizontal` props
- Add custom breakpoints in `global.css` (mobile threshold: `max-width: 768px`)
- Test CommandBar behavior in mobile view (may need `flex-direction: column`)

## Authentication Flow
1. Configure MSAL with Azure AD app registration (client ID, tenant ID in `.env`)
2. Store tokens obtained via `acquireTokenSilent()`
3. Pass tokens in `Authorization: Bearer` headers to Graph/Dataverse APIs

## Deployment

### Azure Static Web Apps
- GitHub Actions workflow at `.github/workflows/azure-static-web-apps.yml`
- Requires secret: `AZURE_STATIC_WEB_APPS_API_TOKEN`
- Build outputs to `dist/` (Vite default)
- Trigger: push to `main` branch

### Environment Variables
Store in `.env`:
```
VITE_CLIENT_ID=<Azure AD App ID>
VITE_TENANT_ID=<Azure AD Tenant>
VITE_DATAVERSE_API=<Dataverse endpoint>
```

## Common Patterns

### Fetching Documents from SharePoint
1. Get access token via MSAL
2. Fetch source configurations from Dataverse
3. For each source: resolve `siteId` → `driveId` → fetch documents
4. Use Graph API pagination (`$top`, `$skip`) for large libraries
5. Cache results in localStorage/IndexedDB to reduce API calls

### Error Handling
- Gracefully handle missing SharePoint sites/libraries in configuration
- Implement retry logic for Graph API rate limits
- Validate Dataverse table access permissions before queries

## Key Files to Reference

- `README.md`: Complete implementation examples for all major components
- Architecture sections detail Graph API integration patterns and Dataverse schema
