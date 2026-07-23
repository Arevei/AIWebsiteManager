# AREVEI local dev

Backend:
```powershell
.\scripts\start-backend-dev.ps1
```

Frontend:
```powershell
.\scripts\start-frontend-dev.ps1
```

URLs:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000/api/

Demo accounts seeded on backend startup:
- founder@demo.com / Demo@1234
- admin@arevei.com / Admin@1234

Local dev uses `USE_MOCK_DB=true`, so data is in-memory unless you replace `MONGO_URL` with a real MongoDB instance and remove that flag.

AI Workspace Builder:
- Open `/admin/dev` after signing in.
- Start from a prompt, import a GitHub repository, or later wire ZIP upload into the same workspace creation flow.
- Without GitHub App env vars, the platform uses a mock repository so the full prompt-to-workspace flow is testable.
- For real GitHub repositories, configure `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, and `GITHUB_PRIVATE_KEY` in `backend/.env`.
- For real AI code edits instead of the local fallback, configure `OPENAI_API_KEY` and optionally `OPENAI_MODEL`.
- For the recommended real workspace runtime, configure `DAYTONA_API_KEY`. You can also set `WORKSPACE_RUNTIME_PROVIDER` to `daytona`, `devpod`, `coder`, `gitpod`, or `e2b` with the matching provider token.
- Until `WORKSPACE_RUNTIME_BRIDGE_ENABLED=true` and the provider bridge is wired, `/admin/dev` uses the built-in static preview fallback and records runtime logs without running real shell commands.
- For future real Vercel deployments, configure `VERCEL_TOKEN`; the current MVP records deploy jobs and leaves upload-based deploy execution for the container workspace phase.

Recommended AREVEI runtime architecture:
- AREVEI owns auth, GitHub App install, repo selection, prompt orchestration, AI model calls, code retrieval, diff review, accept/reject, chat memory, billing, commit/push, deployment jobs, and the browser workspace UI.
- Daytona is the preferred third-party runtime for persistent workspace compute: filesystem, dependency install, terminal commands, snapshots, and live preview URLs. DevPod, Coder, Gitpod, and E2B can fit behind the same runtime bridge.
- Accepted AI changes are synced into the runtime; rejected changes never touch the runtime or GitHub.
- Each workspace stores a lightweight knowledge index: repository structure, dependency graph, component/module graph, page graph, API graph, symbol index, file summaries, chat history, task outcomes, commits, and deployments.
