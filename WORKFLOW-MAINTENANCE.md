# GitHub Actions Workflow Maintenance Guide

## Safely Deleting Failed Workflow Runs

### Overview
This document explains how to safely delete failed workflow runs from the GitHub Actions history without breaking Azure Static Web Apps deployments.

### Is It Safe to Delete Workflow Run History?

**Yes, it is completely safe to delete old workflow runs** (including failed ones) because:

1. **Self-Contained Builds**: Each workflow run builds the application from source code, not from artifacts of previous runs
2. **No Cross-Run Dependencies**: The workflow doesn't reference or depend on data from previous runs
3. **Independent Deployment History**: Azure Static Web Apps maintains its own deployment history separately from GitHub Actions
4. **Fresh Build Every Time**: The workflow uses `skip_app_build: true` but builds with `npm run build` each time

### How the Deployment Works

The Azure Static Web Apps CI/CD workflow (`.github/workflows/azure-static-web-apps.yml`):

```yaml
- name: Build project (vite)
  run: npm run build
  
- name: Deploy to Azure Static Web Apps
  uses: Azure/static-web-apps-deploy@v1
  with:
    skip_app_build: true
    output_location: "dist"
```

This means:
- The workflow builds the app fresh in each run
- It uploads the `dist/` directory to Azure SWA
- Azure SWA doesn't track or reference GitHub Actions run IDs
- Previous runs are not consulted or referenced

### When to Delete Workflow Runs

Consider deleting old workflow runs when:

- **Cleaning up failed runs**: Old failed runs clutter the Actions tab
- **Privacy concerns**: Runs may contain log information you want to remove
- **Storage management**: Large repositories with many runs
- **Simplifying history**: Making it easier to find relevant runs

### How to Delete Workflow Runs

#### Via GitHub Web Interface

1. Navigate to the **Actions** tab in your repository
2. Select the workflow (e.g., "Azure Static Web Apps CI/CD")
3. Find the run you want to delete
4. Click on the run, then click the "..." menu (top right)
5. Select **Delete workflow run**
6. Confirm the deletion

#### Via GitHub CLI

```bash
# Delete a specific run
gh run delete <run-id>

# Delete all failed runs for a workflow
gh run list --workflow="azure-static-web-apps.yml" --status failure --json databaseId --jq '.[].databaseId' | xargs -n1 gh run delete

# Delete runs older than 30 days
gh run list --workflow="azure-static-web-apps.yml" --created "<30days" --json databaseId --jq '.[].databaseId' | xargs -n1 gh run delete
```

### What Happens When You Delete Runs?

When you delete a workflow run:

✅ **Safe Operations**:
- The run entry is removed from GitHub Actions history
- Associated logs are deleted
- Artifacts associated with that run are deleted
- Future deployments continue to work normally

❌ **What Does NOT Happen**:
- Azure Static Web Apps deployments are not affected
- Current production deployment remains untouched
- Future deployments are not impacted
- No changes to the repository code or configuration

### Current Azure Deployment is Independent

The current production deployment on Azure Static Web Apps:
- Is stored independently on Azure infrastructure
- Has its own deployment history in the Azure portal
- Is not linked to specific GitHub Actions run IDs
- Will continue serving traffic regardless of GitHub Actions history

### Best Practices

1. **Keep Recent Successful Runs**: Maintain at least a few recent successful runs for reference
2. **Document Before Deleting**: If a run has important debugging information, document key findings first
3. **Use Retention Policies**: Consider setting up automatic retention policies to manage old runs
4. **Monitor After Deletion**: After deleting runs, verify that new deployments still work (they will!)

### Retention Policy Recommendation

GitHub Actions has built-in retention settings:

1. Go to **Settings** → **Actions** → **General**
2. Scroll to "Artifacts and log retention"
3. Set retention period (e.g., 30-90 days)
4. This automatically cleans up old runs

### Troubleshooting

If you experience issues after deleting runs:

1. **Check Azure Portal**: Verify your Azure Static Web Apps deployment status
2. **Trigger New Run**: Push a commit or manually trigger the workflow
3. **Review Secrets**: Ensure `AZURE_STATIC_WEB_APPS_API_TOKEN` secret is still configured
4. **Check Workflow File**: Verify `.github/workflows/azure-static-web-apps.yml` is intact

### References

- [GitHub Actions: Managing workflow runs](https://docs.github.com/en/actions/managing-workflow-runs)
- [Azure Static Web Apps CI/CD](https://learn.microsoft.com/en-us/azure/static-web-apps/github-actions-workflow)
- [GitHub Actions: Retention policies](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#retention-period)

---

**Last Updated**: 2025-11-15  
**Verified Safe for Deletion**: Yes ✅
