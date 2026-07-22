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

AI GitHub Development Platform:
- Open `/admin/dev` after signing in.
- Without GitHub App env vars, the platform uses a mock repository so the full workspace flow is testable.
- For real GitHub repositories, configure `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, and `GITHUB_PRIVATE_KEY` in `backend/.env`.
- For real AI code edits instead of the local fallback, configure `OPENAI_API_KEY` and optionally `OPENAI_MODEL`.
- For future real Vercel deployments, configure `VERCEL_TOKEN`; the current MVP records deploy jobs and leaves upload-based deploy execution for the container workspace phase.
