import type { Response } from 'express';

export function ok<T>(response: Response, data: T, status = 200) {
  return response.status(status).json({
    data,
    error: null
  });
}

export function created<T>(response: Response, data: T) {
  return ok(response, data, 201);
}

export function noContent(response: Response) {
  return response.status(204).send();
}