import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { AppError } from './common/errors/app-error';
import { errorHandler } from './common/middleware/error-handler';
import { notFoundHandler } from './common/middleware/not-found';
import { requireAuth } from './common/middleware/require-auth';
import { requestIdMiddleware } from './common/middleware/request-id';
import { requestLogger } from './common/middleware/request-logger';
import { securityHeaders } from './common/middleware/security';
import { validateLoginRequest } from './common/validators/auth-validator';
import { asyncHandler } from './common/utils/async-handler';
import {
  getDemoAccounts,
  loginWithMockAccount,
  logoutToken
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

app.get(`${env.apiPrefix}/health`, (_request, response) => {
  response.status(200).json({
    data: {
      status: 'ok',
      app: 'smartops-supply-web-backend',
      time: new Date().toISOString(),
      allowedOrigins: env.allowedOrigins
    },
    error: null
  });
});

app.get(`${env.apiPrefix}/auth/demo-accounts`, (_request, response) => {
  response.status(200).json({
    data: getDemoAccounts(),
    error: null
  });
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

    response.status(200).json({
      data: session,
      error: null
    });
  })
);

app.get(
  `${env.apiPrefix}/auth/me`,
  requireAuth,
  asyncHandler(async (request, response) => {
    response.status(200).json({
      data: request.currentUser,
      error: null
    });
  })
);

app.post(
  `${env.apiPrefix}/auth/logout`,
  asyncHandler(async (request, response) => {
    const authorization = request.headers.authorization;
    const token =
      authorization && authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : null;

    logoutToken(token);

    response.status(200).json({
      data: {
        success: true
      },
      error: null
    });
  })
);

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