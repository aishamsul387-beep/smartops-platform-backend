import type { NextFunction, Request, Response } from 'express';

function getClientIp(request: Request) {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0];
  }

  return request.ip || 'unknown';
}

export function requestLogger(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const startedAt = Date.now();

  response.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const requestId = request.requestId || 'n/a';
    const ip = getClientIp(request);

    console.log(
      [
        '[HTTP]',
        request.method,
        request.originalUrl,
        `status=${response.statusCode}`,
        `durationMs=${durationMs}`,
        `ip=${ip}`,
        `requestId=${requestId}`
      ].join(' ')
    );
  });

  next();
}