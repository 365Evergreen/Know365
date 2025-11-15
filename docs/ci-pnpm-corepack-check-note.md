chore(ci): add pnpm Corepack activation check workflow

This change adds a workflow `.github/workflows/pnpm-corepack-check.yml` that scans repository workflows for any `pnpm` usage and fails the check if Corepack activation (`corepack enable` or `corepack prepare pnpm`) is not present. This helps prevent CI failures caused by missing `pnpm` on runners.
