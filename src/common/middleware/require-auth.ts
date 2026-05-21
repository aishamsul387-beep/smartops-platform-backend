import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { getUserByToken } from '../../lib/mock-auth';

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

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const token = getBearerToken(request);
  const user = getUserByToken(token);

  if (!user) {
    next(
      new AppError({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing access token'
      })
    );
    return;
  }

  request.currentUser = user;
  next();
}