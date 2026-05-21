import type { NextFunction, Request, Response } from 'express';

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const requestId = generateRequestId();

  request.requestId = requestId;
  request.startedAt = Date.now();

  response.setHeader('X-Request-Id', requestId);

  next();
}