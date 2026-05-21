import type { AuthUser } from './auth';

declare global {
  namespace Express {
    interface Request {
      currentUser?: AuthUser;
      requestId?: string;
      startedAt?: number;
    }
  }
}

export {};