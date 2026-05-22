import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { requireTrimmedString } from './rules';

export function validateRefreshRequest(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  try {
    request.body = {
      refreshToken: requireTrimmedString(request.body?.refreshToken, 'refreshToken', {
        minLength: 10,
        maxLength: 500
      })
    };

    next();
  } catch (error) {
    next(error);
  }
}