# Introduction 

Knowledge Centre hosted in your Microsoft 365 tenant, with a React-based frontend (standalone or Azure Static Web App) integrated with Microsoft 365 services (Dataverse,SharePoint, OneDrive, Teams) and Power Platform (Power Apps, Power Automate, Power BI). 

This solution will centralise organisational knowledge, streamline content discovery, and enhance collaboration.

# Getting Started
Here’s a **starter scaffold** for your knowledge management app with **pnpm** instructions:

## **Directory Structure**

    knowledge-centre/
    ├── README.md
    ├── package.json
    ├── pnpm-lock.yaml
    ├── tsconfig.json
    ├── vite.config.ts
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── components/
    │   │   └── Header.tsx
    │   ├── pages/
    │   │   └── Home.tsx
    │   ├── services/
    │   │   └── graphClient.ts
    │   ├── styles/
    │   │   └── global.css
    └── .env

***

## **Tech Stack**

*   **React + TypeScript** (frontend)
*   **Vite** (fast build tool)
*   **Fluent UI** (Microsoft design system)
*   **MSAL.js** (Azure AD authentication)
*   **pnpm** (package manager)

***

## **Setup Instructions (with pnpm)**

1.  **Install pnpm globally** (if not already):
    ```bash
    npm install -g pnpm
    ```

2.  **Create the project folder and initialise**:
    ```bash
    mkdir knowledge-centre && cd knowledge-centre
    pnpm init
    ```

3.  **Install dependencies**:
    ```bash
    pnpm add react react-dom @fluentui/react msal-browser
    pnpm add -D typescript vite @vitejs/plugin-react eslint
    ```

4.  **Generate TypeScript config**:
    ```bash
    pnpm exec tsc --init
    ```

5.  **Add scripts to `package.json`**:
    ```json
    {
      "scripts": {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview"
      }
    }
    ```

6.  **Run the development server**:
    ```bash
    pnpm dev
    ```

***

## **Next Steps**

*   Configure **MSAL** for Azure AD login in `graphClient.ts`.
*   Add **environment variables** in `.env` for client ID and tenant ID.
*   Scaffold **Power Platform integration** (Power Automate flows, Dataverse API calls).
*   Set up **CI/CD with GitHub Actions** for Azure Static Web Apps deployment.

***

# Build and Test

## **UI design**

Here’s a **React + Fluent UI boilerplate** with **responsive breakpoints**, **dark mode support**, and **accessibility best practices**:

***

## ✅ **Project Structure**

    src/
    ├── App.tsx
    ├── main.tsx
    ├── components/
    │   ├── Header.tsx
    │   ├── Hero.tsx
    │   ├── ContentTabs.tsx
    │   └── Footer.tsx
    ├── styles/
    │   └── global.css

***

## **1. Theme Setup (Light/Dark Mode)**

```typescript
// src/theme.ts
import { createTheme } from '@fluentui/react';

export const lightTheme = createTheme({
  palette: {
    themePrimary: '#0078d4',
    neutralLight: '#f3f2f1',
    neutralDark: '#201f1e',
  },
});

export const darkTheme = createTheme({
  palette: {
    themePrimary: '#0078d4',
    neutralLight: '#201f1e',
    neutralDark: '#f3f2f1',
  },
});
```

***

## **2. App Root with ThemeProvider**

```typescript
// src/App.tsx
import React, { useState } from 'react';
import { ThemeProvider, Stack } from '@fluentui/react';
import { lightTheme, darkTheme } from './theme';
import Header from './components/Header';
import Hero from './components/Hero';
import ContentTabs from './components/ContentTabs';
import Footer from './components/Footer';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <Stack verticalFill styles={{ root: { minHeight: '100vh' } }}>
        <Header onToggleTheme={() => setIsDarkMode(!isDarkMode)} />
        <Hero />
        <ContentTabs />
        <Footer />
      </Stack>
    </ThemeProvider>
  );
};

export default App;
```

***

## **3. Header with Search & Persona**

```typescript
// src/components/Header.tsx
import React from 'react';
import { CommandBar, SearchBox, Persona, PersonaSize } from '@fluentui/react';

interface HeaderProps {
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleTheme }) => {
  const items = [
    { key: 'home', text: 'Home', iconProps: { iconName: 'Home' } },
    { key: 'docs', text: 'Docs', iconProps: { iconName: 'Documentation' } },
  ];

  return (
    <header aria-label="Main navigation">
      <CommandBar
        items={items}
        farItems={[
          {
            key: 'search',
            onRender: () => (
              <SearchBox
                placeholder="Search knowledge..."
                ariaLabel="Search knowledge articles"
              />
            ),
          },
          {
            key: 'themeToggle',
            text: 'Toggle Theme',
            iconProps: { iconName: 'Brightness' },
            onClick: onToggleTheme,
          },
          {
            key: 'profile',
            onRender: () => (
              <Persona text="User Name" size={PersonaSize.size32} />
            ),
          },
        ]}
      />
    </header>
  );
};

export default Header;
```

***

## **4. Hero Section**

```typescript
// src/components/Hero.tsx
import React from 'react';
import { Stack, Text } from '@fluentui/react';

const Hero: React.FC = () => (
  <Stack
    horizontalAlign="center"
    verticalAlign="center"
    styles={{ root: { padding: '2rem', textAlign: 'center' } }}
  >
    <Text variant="xxLarge" block>
      Welcome to the Knowledge Centre
    </Text>
    <Text variant="large" block>
      Find resources, guides, and best practices in one place.
    </Text>
  </Stack>
);

export default Hero;
```

***

## **5. Content Tabs**

```typescript
// src/components/ContentTabs.tsx
import React from 'react';
import { Pivot, PivotItem, DetailsList, IColumn } from '@fluentui/react';

const columns: IColumn[] = [
  { key: 'title', name: 'Title', fieldName: 'title', minWidth: 100 },
  { key: 'category', name: 'Category', fieldName: 'category', minWidth: 100 },
];

const items = [
  { title: 'Getting Started', category: 'Basics' },
  { title: 'Advanced Tips', category: 'Guides' },
];

const ContentTabs: React.FC = () => (
  <Pivot aria-label="Content categories">
    <PivotItem headerText="Recent">
      <DetailsList items={items} columns={columns} />
    </PivotItem>
    <PivotItem headerText="Popular">
      <DetailsList items={items} columns={columns} />
    </PivotItem>
  </Pivot>
);

export default ContentTabs;
```

***

## **6. Footer**

```typescript
// src/components/Footer.tsx
import React from 'react';
import { Stack, Link } from '@fluentui/react';

const Footer: React.FC = () => (
  <Stack
    horizontalAlign="center"
    styles={{ root: { padding: '1rem', borderTop: '1px solid #ccc' } }}
  >
    #Privacy</Link> | #Terms</Link> |{' '}
    #Support</Link>
  </Stack>
);

export default Footer;
```

***

### ✅ **Responsive Breakpoints**

*   Use **Fluent UI `Stack`** with `wrap` and `horizontal` props for responsive layouts.
*   Add CSS media queries in `global.css` for fine-grained control:

```css
@media (max-width: 768px) {
  .commandBar {
    flex-direction: column;
  }
}
```

***

### ✅ **Accessibility Best Practices**

*   Use `aria-label` for navigation and search.
*   Ensure colour contrast meets WCAG 2.1 AA.
*   Keyboard navigation: Fluent UI components support tab order by default.
*   Add `role` attributes where needed (e.g., `role="navigation"`).

***

## Microsft Graph API integration
***

## ✅ **1. Concept Overview**

*   **Goal**: Dynamically manage SharePoint sources and related Graph queries in **Dataverse**.
*   **Approach**:
    *   Store configuration in a Dataverse table (e.g., `KnowledgeSources`).
        *   Columns: `SourceName`, `SharePointSiteUrl`, `LibraryName`, `GraphEndpoint`.
    *   App reads this table via **Power Platform connector** or **Dataverse Web API**.
    *   For each entry, execute Graph API calls to fetch documents.

***

## ✅ **2. Dataverse Table Structure**

| Column Name       | Type | Example Value                                  |
| ----------------- | ---- | ---------------------------------------------- |
| SourceName        | Text | HR Policies                                    |
| SharePointSiteUrl | Text | <https://contoso.sharepoint.com/sites/hr>      |
| LibraryName       | Text | Documents                                      |
| GraphEndpoint     | Text | /sites/{siteId}/drives/{driveId}/root/children |

***

## ✅ **3. Fetch Configuration from Dataverse**

Use **Power Platform connector** or REST API:

```typescript
// src/services/dataverseClient.ts
export const getKnowledgeSources = async (): Promise<any[]> => {
  const response = await fetch(
    `${import.meta.env.VITE_DATAVERSE_API}/KnowledgeSources`,
    {
      headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
      },
    }
  );
  return response.json();
};
```

***

## ✅ **4. Graph API for SharePoint Document Search**

First, resolve **siteId** and **driveId** dynamically:

```typescript
// src/services/sharePointGraph.ts
import { getGraphClient } from './graphClient';

export const getSiteId = async (accessToken: string, siteUrl: string) => {
  const client = getGraphClient(accessToken);
  const site = await client.api(`/sites/${siteUrl}`).get();
  return site.id;
};

export const getDriveId = async (accessToken: string, siteId: string, libraryName: string) => {
  const client = getGraphClient(accessToken);
  const drives = await client.api(`/sites/${siteId}/drives`).get();
  const drive = drives.value.find((d: any) => d.name === libraryName);
  return drive.id;
};

export const getDocuments = async (accessToken: string, siteId: string, driveId: string) => {
  const client = getGraphClient(accessToken);
  return client.api(`/sites/${siteId}/drives/${driveId}/root/children`).get();
};
```

***

## ✅ **5. Scalable Integration Flow**

```typescript
// src/App.tsx (simplified)
useEffect(() => {
  if (accounts.length > 0) {
    instance.acquireTokenSilent({ scopes: ['Sites.Read.All'], account: accounts[0] })
      .then(async response => {
        const sources = await getKnowledgeSources();
        const allDocs = [];
        for (const source of sources) {
          const siteId = await getSiteId(response.accessToken, source.SharePointSiteUrl);
          const driveId = await getDriveId(response.accessToken, siteId, source.LibraryName);
          const docs = await getDocuments(response.accessToken, siteId, driveId);
          allDocs.push({ source: source.SourceName, docs });
        }
        setDocuments(allDocs);
      });
  }
}, [accounts]);
```

***

## ✅ **6. Best Practices**

*   **Caching**: Use local storage or IndexedDB for caching document metadata.
*   **Pagination**: Graph API supports `$top` and `$skip` for large libraries.
*   **Security**: Ensure Dataverse table access is restricted via role-based permissions.
*   **Error Handling**: Gracefully handle missing site or library configurations.

***

## ✅ **Next Steps**

Would you like me to:

1.  **Add Power Automate flow template** for syncing new SharePoint sources into Dataverse automatically?
2.  **Generate a complete React component to display documents grouped by source with Fluent UI DetailsList**?
3.  **Bundle everything into a GitHub repo with pnpm, MSAL, Graph integration, Dataverse config, and Azure SWA CI/CD ready to deploy**?

Which one should I do first?


Would you like me to **bundle this into a ready-to-run GitHub repo with pnpm setup and the Azure SWA workflow included**, or **add MSAL authentication and Graph API integration to this scaffold next**?


## Deployment

**Create Azure SWA in the Portal:**

Go to https://portal.azure.com.
Create a new SWA and link it to your GitHub repo.


**Generate Deployment Token:**

In the SWA resource, go to Deployment Token.
Copy the token and add it as a GitHub Secret:

AZURE_STATIC_WEB_APPS_API_TOKEN

Push Workflow File:

Commit .github/workflows/azure-static-web-apps.yml to your repo.
Push to main branch.


**Trigger Deployment:**

Every push to main will build with pnpm and deploy to Azure SWA.

### Github actions workflow

'''name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Build project
        run: pnpm build

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }} # Used for GitHub integrations (e.g., PR comments)
          action: "upload"
          app_location: "/" # Root of your app
          output_location: "dist" # Vite build output folder'''


# Maintenance & Operations

## GitHub Actions Workflow Maintenance

The repository uses GitHub Actions for CI/CD with Azure Static Web Apps. It is **completely safe to delete old workflow runs** from the Actions history, including failed runs. Each deployment is self-contained and does not depend on previous workflow runs.

For detailed information on workflow maintenance and safely deleting runs, see:
- [WORKFLOW-MAINTENANCE.md](./WORKFLOW-MAINTENANCE.md) - Complete guide on workflow deletion safety

### Quick Facts
- ✅ Safe to delete any old workflow runs
- ✅ Deployments build fresh from source each time
- ✅ No cross-run dependencies
- ✅ Azure deployment history is independent

# Contribute
TODO: Explain how other users and developers can contribute to make your code better. 

If you want to learn more about creating good readme files then refer the following [guidelines](https://docs.microsoft.com/en-us/azure/devops/repos/git/create-a-readme?view=azure-devops). You can also seek inspiration from the below readme files:
- [ASP.NET Core](https://github.com/aspnet/Home)
- [Visual Studio Code](https://github.com/Microsoft/vscode)
- [Chakra Core](https://github.com/Microsoft/ChakraCore)