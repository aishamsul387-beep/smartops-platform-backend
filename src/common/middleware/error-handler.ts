import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction
) {
  const requestId = request.requestId || 'n/a';

  if (error instanceof AppError) {
    console.error(
      `[ERROR] requestId=${requestId} code=${error.code} status=${error.status} message=${error.message}`
    );

    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
        requestId
      }
    });
    return;
  }

  const message =
    error instanceof Error ? error.message : 'An unexpected server error occurred';

  console.error(
    `[ERROR] requestId=${requestId} code=INTERNAL_SERVER_ERROR status=500 message=${message}`
  );

  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
      details: null,
      requestId
    }
  });
}