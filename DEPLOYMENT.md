# Deployment Guide: Vercel & Render

This repository is pre-configured for deployment with **Vercel** (Frontend) and **Render** (Backend API & Database).

---

## 1. Deploy Frontend on Vercel

### Step 1: Connect GitHub Repository to Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Import your repository: `shruti316/ai-marketplace-analyzer`.

### Step 2: Configure Project Settings
- **Framework Preset**: `Vite` (automatically detected)
- **Root Directory**: Click *Edit* and select `frontend` (or leave as root `/`; root `vercel.json` and `vercel-build` are preconfigured).
- **Build Command**: `npm run build` (or default)
- **Output Directory**: `dist`

### Step 3: Set Environment Variables
In the **Environment Variables** section, add:
| Key | Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://<your-backend>.onrender.com` | Your deployed Render backend URL (no trailing slash needed) |
| `VITE_APP_ENV` | `production` | Production environment flag |

### Step 4: Deploy
- Click **Deploy**. Vercel will build and deploy the SPA in ~30 seconds.
- Single-page application (SPA) routing rewrites are configured in `vercel.json` so navigating or refreshing deep routes (`/dashboard`, `/scanner`, `/investigate`, `/comparisons`, `/assistant`) will work seamlessly without 404 errors.

---

## 2. Deploy Backend on Render

### Option A: Using Render Blueprint (One-Click)
1. Go to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository.
4. Render will read `render.yaml` automatically and configure the `ai-marketplace-backend` web service.
5. Provide your MySQL database credentials in the environment fields:
   - `DB_HOST`: Hostname of your managed MySQL (e.g. Aiven, PlanetScale, Supabase, or AWS RDS)
   - `DB_USER`: Database username
   - `DB_PASSWORD`: Database password
   - `DB_NAME`: Database schema name

### Option B: Manual Web Service Setup
1. Click **New +** > **Web Service**.
2. Connect your repository.
3. Configure settings:
   - **Name**: `ai-marketplace-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Health Check Path**: `/live`
4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `CORS_ALLOWED_ORIGINS`: `https://*.vercel.app,http://localhost:3000` (or your specific `https://<your-project>.vercel.app` domain)
   - `JWT_SECRET`: A secure 32+ character random secret
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Your database connection details.

---

## 3. Architecture Summary

```
[ User Browser ]
       │
       ▼
[ Vercel (Edge CDN) ]
  • React 18 + Vite 6
  • TailwindCSS + Framer Motion
  • SPA Routing via vercel.json
       │
       │ HTTPS REST APIs
       ▼
[ Render (Web Service) ]
  • Express 5 + TypeScript
  • Wildcard CORS (*.vercel.app)
  • JWT Authentication & Rate Limiting
       │
       ▼
[ MySQL Managed Database ]
```
