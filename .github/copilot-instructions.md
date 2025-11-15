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
# Copilot / AI Agent Instructions — Know365 (concise)

Purpose: give an AI coding agent the minimal, high‑value facts to be productive in this repo.

Quick facts
- **Stack:** React + TypeScript, Vite, Fluent UI, MSAL.js for auth.
- **Package manager:** `pnpm` (use `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm preview`).
- **Deployment:** Azure Static Web Apps via `.github/workflows/azure-static-web-apps.yml` (build outputs to `dist/`).

What matters here (high‑value patterns)
- **Service layer:** all external API logic lives in `src/services/` — inspect `graphClient.ts`, `dataverseClient.ts`, `sharePointGraph.ts` first. These modules are the single source of Graph/Dataverse integration.
- **Auth flow:** MSAL + `useAuth.ts` hook. Call `acquireTokenSilent()` before Graph/Dataverse calls; look at `src/hooks/useAuth.ts` and `src/services/graphClient.ts` for token usage.
- **Configuration table:** the Dataverse table `KnowledgeSources` drives dynamic SharePoint source resolution. Code expects columns: `SourceName`, `SharePointSiteUrl`, `LibraryName`, `GraphEndpoint` (see `README.md` and `src/services/dataverseClient.ts`).
- **UI conventions:** root `App.tsx` wraps a `ThemeProvider` (see `src/theme.ts`) and components use Fluent UI `Stack`, `Pivot`, `DetailsList`. Theme toggle is implemented in `App.tsx`.
- **Data caching:** document fetch code assumes caching (localStorage / IndexedDB) to limit Graph calls — check `RecentDocuments.tsx` and related components for examples.

Developer workflows (explicit)
- Local dev: `pnpm install` → `pnpm dev` (Vite dev server). Use `pnpm preview` to preview production build.
- Build: `pnpm build` produces `dist/` used by GitHub Actions for SWA deployment.
- Useful dev proxies and helpers: see `server/dev-proxy/` (proxying and token tests) and `scripts/` (blob/dataverse migration and icon upload helpers).

Repository conventions to follow
- Always use `pnpm` commands (lockfile is `pnpm-lock.yaml`).
- Keep API integration in `src/services/` — agents should add or update helpers there rather than scattering Graph logic into components.
- Environment variables are `VITE_` prefixed and read via `import.meta.env` (e.g. `VITE_CLIENT_ID`, `VITE_DATAVERSE_API`). Do not add secrets in source.
- Frontend-only changes go under `src/`. Small backend/dev tooling lives under `server/` and `scripts/`.

Key files to inspect when coding or modifying features
- Auth & Graph: `src/services/graphClient.ts`, `src/hooks/useAuth.ts`
- Dataverse: `src/services/dataverseClient.ts`
- SharePoint resolution: `src/services/sharePointGraph.ts`
- App shell & theme: `src/App.tsx`, `src/theme.ts`
- Primary UI examples: `src/components/Header.tsx`, `src/components/ContentTabs.tsx`, `src/pages/SearchPage.tsx`
- Dev helpers: `server/dev-proxy/index.js`, `scripts/migrateBlobsToDataverse.js`

Testing & verification notes
- This repo does not include a formal test harness. Verify changes locally with `pnpm dev` and use `pnpm build` + `pnpm preview` before pushing to CI.
- GitHub Actions will build and deploy the SWA; check logs in the `.github/workflows/azure-static-web-apps.yml` run if CI fails.

Safety and scope
- Do not add secrets or long-lived credentials to the repository. Use environment variables for local testing and GitHub Secrets for CI.
- Keep changes minimal and confined to `src/` and `scripts/` unless you are updating CI/deployment.

If something is unclear or you want me to expand any section (examples, code snippets, or add automations), tell me which area to expand and I will iterate.

You do not need permission to make changes outside of this file, if they are changes I requested.

