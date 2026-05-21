export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(params: {
    message: string;
    status?: number;
    code?: string;
    details?: unknown;
  }) {
    super(params.message);
    this.name = 'AppError';
    this.status = params.status ?? 500;
    this.code = params.code ?? 'INTERNAL_SERVER_ERROR';
    this.details = params.details;
  }
}