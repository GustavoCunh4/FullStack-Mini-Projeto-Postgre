import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

export function maskUri(uri: string) {
  try {
    const parsed = new URL(uri);
    if (parsed.password) parsed.password = '****';
    return parsed.toString();
  } catch {
    return uri.replace(/\/\/([^:]+):[^@]+@/, '//$1:****@');
  }
}

let pool: Pool | null = null;
let migrationsRan = false;

export let currentDatabaseUrl: string | null = null;
export let selectedDatabaseEnvVar: string | null = null;

function shouldUseSSL() {
  const value = (process.env.PG_SSL || '').toLowerCase();
  return value === 'true' || value === '1';
}

function parseNumberEnv(key: string, fallback: number) {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function shouldRejectUnauthorized() {
  const value = (process.env.PG_SSL_REJECT_UNAUTHORIZED || '').toLowerCase();
  if (!value) return true;
  return value !== 'false' && value !== '0';
}

async function runMigrations(client: PoolClient) {
  if (migrationsRan) return;

  await client.query('BEGIN');
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
          status IN ('pending', 'in_progress', 'completed')
        ),
        due_date TIMESTAMPTZ,
        priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (
          priority IN ('low', 'medium', 'high')
        ),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_user_status
        ON tasks (user_id, status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_user_due
        ON tasks (user_id, due_date);
    `);

    await client.query('COMMIT');
    migrationsRan = true;
    logger.info('Migracoes do PostgreSQL executadas (idempotentes)');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

export async function connectDB(): Promise<Pool> {
  if (pool) return pool;

  const env = process.env.NODE_ENV;
  const envVar = env === 'production' ? 'DATABASE_URL_PROD' : 'DATABASE_URL';
  const uri = process.env[envVar];

  if (!uri) {
    throw new Error('DATABASE_URL/DATABASE_URL_PROD nao definidos no .env');
  }

  logger.info(`Ambiente: ${env}`);
  logger.info(`Conectando no PostgreSQL com URI: ${maskUri(uri)}`);

  const connectionTimeoutMillis = parseNumberEnv('PG_CONNECTION_TIMEOUT_MS', 8000);
  const idleTimeoutMillis = parseNumberEnv('PG_IDLE_TIMEOUT_MS', 30000);

  const createdPool = new Pool({
    connectionString: uri,
    connectionTimeoutMillis,
    idleTimeoutMillis,
    keepAlive: true,
    ssl: shouldUseSSL()
      ? { rejectUnauthorized: shouldRejectUnauthorized() }
      : undefined
  });

  createdPool.on('error', (err: Error) => {
    logger.error(`Erro inesperado no pool do PostgreSQL: ${err.message}`);
  });

  selectedDatabaseEnvVar = envVar;
  currentDatabaseUrl = uri;

  try {
    const client = await createdPool.connect();
    try {
      await client.query('SELECT 1');
      await runMigrations(client);
    } finally {
      client.release();
    }
    logger.info('PostgreSQL conectado com sucesso');
    pool = createdPool;
    return createdPool;
  } catch (err: any) {
    logger.error(`Falha ao conectar no PostgreSQL: ${err?.message || err}`);
    currentDatabaseUrl = null;
    selectedDatabaseEnvVar = null;
    await createdPool.end().catch(() => {});
    throw err;
  }
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Pool do PostgreSQL nao inicializado. Execute connectDB primeiro.');
  }
  return pool;
}
