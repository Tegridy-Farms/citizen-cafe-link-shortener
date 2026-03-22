# Pipeline specifications (versioned)

These files are the **canonical** product and delivery specs for this repo. They are written during the Tegridy Farms agent pipeline and committed to Git so history stays with the code.

| File | Author (role) | Purpose |
|------|-----------------|--------|
| `idea.md` | Randy | Raw project idea from kickoff |
| `prd.md` | Kyle | Product requirements |
| `user-flows.md` | Kyle | User journeys |
| `architecture.md` | Stan | Technical architecture |
| `design-bible.md` | Wendy | UX / visual spec |
| `plan.md` | Cartman | Staged implementation plan |
| `plan-status.md` | Cartman | Stage tracker (updated as stages complete) |
| `infra.json` | Randy | Vercel / Neon / GitHub metadata (no secrets) |
| `lessons.md` | Towelie | Post-mortem facts (after production sign-off) |

QA reports and production smoke output live under `../qa/` in this repository.

Orchestration metadata that stays **only** on the OpenClaw host: `company/projects/<project_id>/artifacts/project.json` and `.database-url` (never commit).
