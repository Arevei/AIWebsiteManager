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
