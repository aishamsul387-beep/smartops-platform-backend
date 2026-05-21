import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

export function notFoundHandler(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  next(
    new AppError({
      status: 404,
      code: 'NOT_FOUND',
      message: `Route not found: ${request.method} ${request.originalUrl}`
    })
  );
}