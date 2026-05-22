# Backend Verification Checklist

## Runtime
- [ ] npm run validate-env passes
- [ ] npm run typecheck passes
- [ ] npm run build passes
- [ ] npm run dev starts locally
- [ ] deployed backend is live on Render

## Public Endpoints
- [ ] GET /api/health returns JSON success
- [ ] GET /api/auth/demo-accounts returns demo users
- [ ] invalid route returns JSON error with requestId

## Auth Flow
- [ ] login returns accessToken
- [ ] login returns refreshToken
- [ ] GET /api/auth/me works with bearer token
- [ ] POST /api/auth/refresh returns renewed session
- [ ] POST /api/auth/logout returns success

## CORS and Deployment
- [ ] FRONTEND_URL is set to deployed Vercel domain
- [ ] FRONTEND_URLS is correct if used
- [ ] ALLOW_VERCEL_PREVIEW_DOMAINS matches current deployment policy
- [ ] public frontend login works

## Logging and Error Handling
- [ ] health logs visible
- [ ] request IDs returned on error responses
- [ ] request logger outputs method, path, status, duration
- [ ] 404 responses use JSON error shape
