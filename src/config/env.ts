import dotenv from 'dotenv';

dotenv.config();

function readEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;

  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  port: Number(readEnv('PORT', '4000')),
  apiPrefix: readEnv('API_PREFIX', '/api'),
  frontendUrl: readEnv('FRONTEND_URL', 'http://localhost:3000'),
  nodeEnv: readEnv('NODE_ENV', 'development')
};