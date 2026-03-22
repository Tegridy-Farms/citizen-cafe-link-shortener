# citizen-cafe-link-shortener

Tegridy Farms project — GitHub + Vercel + Neon. Pipeline specs live in docs/pipeline/ in this repo. Host-only (orchestration host): company/projects/citizen-cafe-link-shortener/artifacts/project.json and .database-url.

## Environments

- **Vercel:** DATABASE_URL is set for production, preview, and development when Randy runs project-setup (encrypted). Must match application code — see architecture.md → Environment variables.
- **Local:** Copy .env.example to .env.local and paste your Neon connection string into DATABASE_URL.

## After Stage 1 (Next.js scaffold)

Kenny adds package.json, migrations, and (per architecture.md) **GitHub Actions CI**:

- Copy /home/openclaw/.openclaw/company/templates/github-actions-ci-nextjs.yml → .github/workflows/ci.yml in this repo.
- In GitHub: **Settings → Secrets → Actions** — add DATABASE_URL for CI builds/tests that need Postgres.

## Migrations

Once migrate.sh (or equivalent) exists, document the exact command in architecture.md and run against production Neon **before** declaring production-ready (see company/LEARNINGS.md L10).

## QA / security

Butters runs AgentShield from the repo root. Use the shared wrapper for consistent CLI flags (run from repo root on your machine):

    bash /home/openclaw/.openclaw/scripts/agentshield-scan.sh "\$(pwd)"

Or pin the exact npx ecc-agentshield command in this README after verifying it in your environment (company/LEARNINGS.md L6).
