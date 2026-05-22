# SmartOps Backend Production Runbook

## Service
- Name: smartops-platform-backend
- Runtime: Node.js
- Deployment target: Render

## Public URL
- https://smartops-platform-backend.onrender.com/api

## Main Endpoints
- GET /api/health
- GET /api/auth/demo-accounts
- POST /api/auth/login
- POST /api/auth/refresh
- GET /api/auth/me
- GET /api/auth/session-debug
- POST /api/auth/logout

## Local Run
- npm install
- npm run validate-env
- npm run typecheck
- npm run dev

## Production Build
- npm ci && npm run build
- npm run start

## Required Env
- API_PREFIX
- NODE_ENV
- FRONTEND_URL or FRONTEND_URLS
- ALLOW_VERCEL_PREVIEW_DOMAINS
