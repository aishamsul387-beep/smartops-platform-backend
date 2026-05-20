import cors from 'cors';
import express, { type Request } from 'express';
import { env } from './config/env';
import {
  getDemoAccounts,
  getUserByToken,
  loginWithMockAccount,
  logoutToken
} from './lib/mock-auth';

const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true
  })
);

app.use(express.json());

function getBearerToken(request: Request) {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

app.get(`${env.apiPrefix}/health`, (_request, response) => {
  response.status(200).json({
    data: {
      status: 'ok',
      app: 'smartops-supply-web-backend',
      time: new Date().toISOString()
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

app.post(`${env.apiPrefix}/auth/login`, (request, response) => {
  const email = String(request.body?.email ?? '').trim();
  const password = String(request.body?.password ?? '');

  if (!email || !password) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required'
      }
    });
    return;
  }

  const session = loginWithMockAccount({ email, password });

  if (!session) {
    response.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    });
    return;
  }

  response.status(200).json({
    data: session,
    error: null
  });
});

app.get(`${env.apiPrefix}/auth/me`, (request, response) => {
  const token = getBearerToken(request);
  const user = getUserByToken(token);

  if (!user) {
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing access token'
      }
    });
    return;
  }

  response.status(200).json({
    data: user,
    error: null
  });
});

app.post(`${env.apiPrefix}/auth/logout`, (request, response) => {
  const token = getBearerToken(request);
  logoutToken(token);

  response.status(200).json({
    data: {
      success: true
    },
    error: null
  });
});

app.listen(env.port, () => {
  console.log('SmartOps backend running');
  console.log(`Port: ${env.port}`);
  console.log(`Base URL: http://localhost:${env.port}${env.apiPrefix}`);
  console.log(`Started: ${new Date().toISOString()}`);
});