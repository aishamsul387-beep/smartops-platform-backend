import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { ok } from './common/http/api-response';
import { AppError } from './common/errors/app-error';
import { errorHandler } from './common/middleware/error-handler';
import { notFoundHandler } from './common/middleware/not-found';
import { requireAuth } from './common/middleware/require-auth';
import { requestIdMiddleware } from './common/middleware/request-id';
import { requestLogger } from './common/middleware/request-logger';
import { securityHeaders } from './common/middleware/security';
import { validateLoginRequest } from './common/validators/auth-validator';
import { validateRefreshRequest } from './common/validators/session-validator';
import { asyncHandler } from './common/utils/async-handler';
import { getBearerToken } from './common/auth/token';
import { inventoryRouter } from './modules/inventory/routes';
import { warehouseRouter } from './modules/warehouse/routes';
import { tasksRouter } from './modules/tasks/routes';
import { ordersRouter } from './modules/orders/routes';
import { uomRouter } from './modules/uom/routes';
import { batchesRouter } from './modules/batches/routes';
import { stockControlRouter } from './modules/stock-control/routes';
import {
  getDemoAccounts,
  getSessionDebug,
  loginWithMockAccount,
  refreshSessionByRefreshToken,
  revokeSessionByAccessToken
} from './lib/mock-auth';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', true);

function isAllowedOrigin(origin: string) {
  if (env.allowedOrigins.includes(origin)) {
    return true;
  }

  if (
    env.allowVercelPreviewDomains &&
    origin.startsWith('https://') &&
    origin.includes('smartops-platform') &&
    origin.endsWith('.vercel.app')
  ) {
    return true;
  }

  return false;
}

app.use(requestIdMiddleware);
app.use(requestLogger);
app.use(securityHeaders);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
  })
);

app.use(express.json({ limit: '1mb' }));

app.get('/', (_request, response) => {
  return ok(
    response,
    {
      status: 'ok',
      app: 'smartops-supply-web-backend',
      message: 'SmartOps backend is live. Use /api/health for API health check.',
      time: new Date().toISOString()
    },
    200
  );
});

app.head('/', (_request, response) => {
  response.status(200).end();
});

app.get(`${env.apiPrefix}/health`, (_request, response) => {
  return ok(
    response,
    {
      status: 'ok',
      app: 'smartops-supply-web-backend',
      time: new Date().toISOString(),
      allowedOrigins: env.allowedOrigins
    },
    200
  );
});

app.get(`${env.apiPrefix}/auth/demo-accounts`, (_request, response) => {
  return ok(response, getDemoAccounts(), 200);
});

app.post(
  `${env.apiPrefix}/auth/login`,
  validateLoginRequest,
  asyncHandler(async (request, response) => {
    const email = String(request.body.email);
    const password = String(request.body.password);

    const session = loginWithMockAccount({ email, password });

    if (!session) {
      throw new AppError({
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    return ok(response, session, 200);
  })
);

app.post(
  `${env.apiPrefix}/auth/refresh`,
  validateRefreshRequest,
  asyncHandler(async (request, response) => {
    const refreshToken = String(request.body.refreshToken);
    const session = refreshSessionByRefreshToken(refreshToken);

    if (!session) {
      throw new AppError({
        status: 401,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token'
      });
    }

    return ok(response, session, 200);
  })
);

app.get(
  `${env.apiPrefix}/auth/me`,
  requireAuth,
  asyncHandler(async (request, response) => {
    return ok(response, request.currentUser, 200);
  })
);

app.get(
  `${env.apiPrefix}/auth/session-debug`,
  requireAuth,
  asyncHandler(async (request, response) => {
    const token = getBearerToken(request);
    const session = getSessionDebug(token);

    if (!session) {
      throw new AppError({
        status: 404,
        code: 'SESSION_NOT_FOUND',
        message: 'Active session debug data not found'
      });
    }

    return ok(
      response,
      {
        ...session,
        requestId: request.requestId || null
      },
      200
    );
  })
);

app.post(
  `${env.apiPrefix}/auth/logout`,
  asyncHandler(async (request, response) => {
    const token = getBearerToken(request);
    revokeSessionByAccessToken(token);

    return ok(
      response,
      {
        success: true
      },
      200
    );
  })
);

app.use(`${env.apiPrefix}/inventory`, requireAuth, inventoryRouter);
app.use(`${env.apiPrefix}/batches`, requireAuth, batchesRouter);
app.use(`${env.apiPrefix}/stock-control`, requireAuth, stockControlRouter);
app.use(`${env.apiPrefix}/warehouse`, requireAuth, warehouseRouter);
app.use(`${env.apiPrefix}/tasks`, requireAuth, tasksRouter);
app.use(`${env.apiPrefix}/orders`, requireAuth, ordersRouter);
app.use(`${env.apiPrefix}/uom`, requireAuth, uomRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log('========================================');
  console.log(' SmartOps backend running');
  console.log('========================================');
  console.log(`Port: ${env.port}`);
  console.log(`Base URL: http://localhost:${env.port}${env.apiPrefix}`);
  console.log(`Node env: ${env.nodeEnv}`);
  console.log(`Allowed origins: ${env.allowedOrigins.join(', ') || '(none configured)'}`);
  console.log(
    `Allow Vercel preview domains: ${env.allowVercelPreviewDomains ? 'true' : 'false'}`
  );
  console.log(`Started: ${new Date().toISOString()}`);
});