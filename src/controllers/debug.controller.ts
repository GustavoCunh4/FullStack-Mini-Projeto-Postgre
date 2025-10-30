import { Request, Response } from 'express';
import {
  currentDatabaseUrl,
  getPool,
  maskUri,
  selectedDatabaseEnvVar
} from '../database/connection';

export async function dbInfo(_req: Request, res: Response) {
  try {
    const pool = getPool();

    let database: string | null = null;
    let user: string | null = null;
    let serverVersion: string | null = null;

    try {
      const { rows } = await pool.query<{
        db: string;
        usr: string;
      }>('SELECT current_database() AS db, current_user AS usr');
      database = rows[0]?.db ?? null;
      user = rows[0]?.usr ?? null;
    } catch {
      // best effort: ignore failures
    }

    try {
      const { rows } = await pool.query<{ server_version: string }>(
        'SHOW server_version'
      );
      serverVersion = rows[0]?.server_version ?? null;
    } catch {
      // best effort: ignore failures
    }

    return res.status(200).json({
      env: process.env.NODE_ENV,
      selectedEnvVar: selectedDatabaseEnvVar,
      uriMasked: currentDatabaseUrl ? maskUri(currentDatabaseUrl) : null,
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      },
      connection: {
        database,
        user
      },
      server: {
        version: serverVersion
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Falha ao coletar informacoes do banco',
      detail: err?.message || String(err)
    });
  }
}
