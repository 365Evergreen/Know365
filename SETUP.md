# Knowledge Centre - Setup Guide

## 🚀 Quick Start

This project is now fully scaffolded and ready to run! Follow these steps to get started.

### Prerequisites

- **Node.js** 18+ installed
- **pnpm** installed globally: `npm install -g pnpm`
- **Azure AD App Registration** (for authentication)
- **Azure Static Web App** (for deployment)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Azure AD credentials:

```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
VITE_CLIENT_ID=your-azure-ad-app-client-id
VITE_TENANT_ID=your-azure-ad-tenant-id
VITE_REDIRECT_URI=http://localhost:3000
VITE_DATAVERSE_API=https://your-org.crm.dynamics.com/api/data/v9.2
VITE_GRAPH_SCOPES=Sites.Read.All,User.Read
```

### 3. Run Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

### 4. Build for Production

```bash
pnpm build
```

The production build will be in the `dist/` folder.

## 📋 Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Create a new registration:
   - Name: "Knowledge Centre"
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: Web → `http://localhost:3000` (add production URL later)
3. Copy the **Application (client) ID** and **Directory (tenant) ID**
4. Go to **API permissions** → Add permission:
   - Microsoft Graph → Delegated permissions
   - Add: `Sites.Read.All`, `User.Read`
5. Grant admin consent for your organization

## 🗂️ Project Structure

```
knowledge-centre/
├── .github/
│   ├── copilot-instructions.md    # AI agent instructions
│   └── workflows/
│       └── azure-static-web-apps.yml
├── src/
│   ├── components/                 # React components
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── ContentTabs.tsx
│   │   └── Footer.tsx
│   ├── services/                   # API integration
│   │   ├── authConfig.ts          # MSAL configuration
│   │   ├── graphClient.ts         # Microsoft Graph client
│   │   ├── dataverseClient.ts     # Dataverse API client
│   │   └── sharePointGraph.ts     # SharePoint document fetching
│   ├── styles/
│   │   └── global.css
│   ├── theme.ts                   # Light/dark theme definitions
│   ├── App.tsx                    # Main app component
│   ├── main.tsx                   # Entry point
│   └── vite-env.d.ts             # TypeScript definitions
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

## 🎨 Features Implemented

✅ **Authentication** - MSAL.js integration with Azure AD  
✅ **Theme Support** - Light and dark mode with persistent preference  
✅ **Fluent UI Components** - Microsoft design system  
✅ **Microsoft Graph Integration** - Ready for SharePoint/OneDrive queries  
✅ **Dataverse Client** - Knowledge source configuration management  
✅ **Responsive Design** - Mobile-friendly layout  
✅ **Accessibility** - WCAG 2.1 AA compliant  
✅ **GitHub Actions** - Automated deployment to Azure Static Web Apps  

## 🔄 Deployment to Azure Static Web Apps

### Setup GitHub Secrets

In your GitHub repository settings, add these secrets:

- `AZURE_STATIC_WEB_APPS_API_TOKEN` - 40e361d8770f2bbbf04ab933175bf9ab9770e871e293cb26d7d756ecdf07979f03-02ed17cc-d20d-48be-803b-e9376168787e01e253006560271e
- `VITE_CLIENT_ID` - Azure AD App client ID
- `VITE_TENANT_ID` - Azure AD tenant ID
- `VITE_REDIRECT_URI` - Production URL (e.g., `https://your-app.azurestaticapps.net`)
- `VITE_DATAVERSE_API` - Dataverse API endpoint
- `VITE_GRAPH_SCOPES` - `Sites.Read.All,User.Read`

### Create Azure Static Web App

1. Go to Azure Portal → Create a resource → Static Web App
2. Connect to your GitHub repository
3. Build configuration:
   - Build preset: Custom
   - App location: `/`
   - Output location: `dist`
4. Copy the deployment token and add it to GitHub secrets as `AZURE_STATIC_WEB_APPS_API_TOKEN`

The GitHub Actions workflow will automatically deploy on push to `main` or `DEV` branches.

## 🔐 Dataverse Configuration

Create a table in Dataverse named `KnowledgeSources` with these columns:

| Column Name       | Type | Description                              |
|------------------|------|------------------------------------------|
| SourceName       | Text | Display name for the source              |
| SharePointSiteUrl| Text | Full SharePoint site URL                 |
| LibraryName      | Text | Document library name                    |
| GraphEndpoint    | Text | Optional custom Graph API endpoint       |

## 📚 Next Steps

1. **Test locally** - Run `pnpm dev` and verify authentication works
2. **Add Dataverse sources** - Configure knowledge sources in Dataverse
3. **Customize UI** - Modify components to match your branding
4. **Add features** - Implement search, filtering, favorites, etc.
5. **Deploy** - Push to main branch to trigger deployment

## 🛠️ Development Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm preview      # Preview production build
pnpm lint         # Run ESLint
```

## 📖 Documentation

- See `.github/copilot-instructions.md` for AI agent guidance
- Architecture details in original `README.md`
- [Fluent UI Documentation](https://developer.microsoft.com/en-us/fluentui)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)
- [MSAL.js Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-overview)

## 🤝 Contributing

This is a scaffolded project ready for development. Feel free to:
- Add new components
- Enhance authentication flows
- Implement search and filtering
- Add caching strategies
- Improve error handling

---

**Status**: ✅ Fully scaffolded and ready for development!
