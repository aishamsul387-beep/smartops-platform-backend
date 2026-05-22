import { Pool, type QueryResultRow } from 'pg';
import { env } from '../../config/env';

let pool: Pool | null = null;

export function isPostgresEnabled() {
  return !!env.databaseUrl;
}

export function getPool() {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is not configured.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl:
        env.nodeEnv === 'production'
          ? {
              rejectUnauthorized: false
            }
          : false
    });
  }

  return pool;
}

export async function queryRows<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = getPool();
  const result = await client.query<T>(text, params);
  return result.rows;
}

export async function execute(text: string, params: unknown[] = []) {
  const client = getPool();
  await client.query(text, params);
}