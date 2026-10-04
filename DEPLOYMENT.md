# AeroSentinel Deployment Guide

This project is deployed on Render as two separate services:
- **Backend**: FastAPI Python Web Service
- **Frontend**: React + Vite Static Site

---

## 1. PostgreSQL Database

Create a PostgreSQL database on Render and note the connection string.

**Render Dashboard:** New PostgreSQL Service
- **Database Name**: `aerosentinel`
- **User**: `aerosentinel_user`
- **Password**: (generate secure password, note it down)
- **Internal Database Name**: `aerosentinel`

The connection string format will be:
```
postgresql://aerosentinel_user:aerosentinel_pass@internal-db-hostname.onrender.com:5432/aerosentinel
```

Set the `DATABASE_URL` environment variable on the backend service to this value.

**Important**: Do NOT hardcode the PostgreSQL URL in the code. The backend reads `DATABASE_URL` from the environment:

```python
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aerosentinel.db")
```

The default SQLite fallback is only for local development.

---

## 2. Backend Web Service (FastAPI + Uvicorn)

| Setting | Value |
|---|---|
| **Root Directory** | `backend/` |
| **Build Command** | (empty - no build step needed for pure Python) |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Health Check Path** | `/health` |

### Required Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URL (required for production) | `postgresql://user:pass@host:port/db` |
| `JWT_SECRET` | Secret key for JWT token signing | `change-this-to-a-secure-random-value` |
| `FRONTEND_URL` | Frontend URL for CORS configuration | `https://your-frontend-on-render.com` |
| `API_URL` | Override for the API base URL (optional) | `https://your-backend-on-render.com` |

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or use the provided `DATABASE_URL` override:
```bash
DATABASE_URL=postgresql://... uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 3. Frontend Static Site (React + Vite)

| Setting | Value |
|---|---|
| **Root Directory** | `frontend/` |
| **Build Command** | `npm run build` |
| **Publish Directory** | `dist/` |

### Required Environment Variables

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `https://your-backend-on-render.com` |
| `BACKEND_URL` | (optional) Used by Vite dev proxy | `http://localhost:8000` |

### Local Development

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api`, `/health`, and `/ready` to the backend when `BACKEND_URL` is set or defaults to `http://localhost:8000`.

---

## 4. Configuration Summary

### Backend `.env.example`

```env
# Database
DATABASE_URL=postgresql://aerosentinel_user:aerosentinel_pass@internal-db-hostname.onrender.com:5432/aerosentinel

# Security
JWT_SECRET=change-this-to-a-secure-random-value

# Model path (relative to backend directory)
MODEL_PATH=./models

# Frontend URL for CORS and API calls
FRONTEND_URL=http://localhost:5173

# API base URL (used by frontend VITE_API_URL)
API_URL=http://localhost:8000

# Optional:
# LLM_API_KEY=
```

### Frontend `.env.example`

```env
# Vite environment variables
# https://vite.dev/guide/env-variables

# Backend API URL
# - Local development: http://localhost:8000
# - Production: set via VITE_API_URL env var, e.g. https://your-backend-on-render.com
VITE_API_URL=http://localhost:8000
```

---

## 5. Post-Deployment Testing Checklist

After deploying both services, verify:

1. ✅ Backend service starts successfully and logs show "server started", "database initialized", "ML models initialized"
2. ✅ `/health` endpoint returns `{"status": "healthy", ...}`
3. ✅ `/ready` endpoint returns `{"status": "ready", ...}`
4. ✅ CORS is configured correctly (no browser console origin errors)
5. ✅ Login endpoint works with demo credentials
6. ✅ Fleet page loads aircraft data
7. ✅ Predictions page loads failure predictions
8. ✅ Recommendations page loads AI recommendations
9. ✅ Work orders can be created
10. ✅ Database tables are populated (check PostgreSQL dashboard)
11. ✅ Refreshing navigation routes (/dashboard, /fleet, /predictions, etc.) does not return 4014. ✅ No JavaScript errors in the frontend console

---

## 6. Local Development Commands

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Full Stack (with proxy)
```bash
# Start backend in one terminal
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Start frontend in another terminal  
cd frontend
npm run dev  # Vite proxy will forward /api to localhost:8000
```

---

## 7. Render-Specific Notes

- **Backend**: Set `Render > Web Service > Environment` variables for `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`
- **Frontend**: Set `Render > Static Site > Environment` variable for `VITE_API_URL`
- The Render backend URL will be something like `https://aerosentinel-backend.onrender.com`
- Set `VITE_API_URL=https://aerosentinel-backend.onrender.com` in the frontend service environment
- Set `FRONTEND_URL=https://aerosentinel-frontend.onrender.com` in the backend service environment for CORS
- PostgreSQL internal hostname is only accessible from within the Render network; the frontend cannot connect directly to PostgreSQL