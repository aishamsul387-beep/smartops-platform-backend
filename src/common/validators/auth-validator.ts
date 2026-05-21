import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export function validateLoginRequest(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  const email = String(request.body?.email ?? '').trim();
  const password = String(request.body?.password ?? '');

  if (!email || !password) {
    next(
      new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required'
      })
    );
    return;
  }

  if (!isValidEmail(email)) {
    next(
      new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'A valid email address is required'
      })
    );
    return;
  }

  if (password.length < 6) {
    next(
      new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Password must be at least 6 characters'
      })
    );
    return;
  }

  request.body = {
    ...request.body,
    email,
    password
  };

  next();
}