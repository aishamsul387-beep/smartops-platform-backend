import dotenv from 'dotenv';

dotenv.config();

function readEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;

  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === '') {
    return fallback;
  }

  return value.trim().toLowerCase() === 'true';
}

function parseOrigins() {
  const singleOrigin = process.env.FRONTEND_URL?.trim();
  const multiOriginsRaw = process.env.FRONTEND_URLS?.trim();

  const combined = [
    ...(singleOrigin ? [singleOrigin] : []),
    ...(multiOriginsRaw
      ? multiOriginsRaw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [])
  ];

  return Array.from(new Set(combined));
}

export const env = {
  port: Number(process.env.PORT || '4000'),
  apiPrefix: readEnv('API_PREFIX', '/api'),
  nodeEnv: readEnv('NODE_ENV', 'development'),
  allowedOrigins: parseOrigins(),
  allowVercelPreviewDomains: parseBoolean(
    process.env.ALLOW_VERCEL_PREVIEW_DOMAINS,
    true
  )
};