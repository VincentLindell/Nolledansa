import "server-only";

import { Pool, PoolClient, QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __nolledansaPool: Pool | null | undefined;
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
}

function createPool() {
  return new Pool({
    connectionString: requireEnv("DATABASE_URL"),
    max: 10,
  });
}

function getPool() {
  if (!global.__nolledansaPool) {
    global.__nolledansaPool = createPool();
  }
  return global.__nolledansaPool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
