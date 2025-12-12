import 'dotenv/config';
import app from '../src/app';
import { connectDB } from '../src/database/connection';

let conn: Promise<void> | null = null;

async function ensureDatabaseConnection() {
  if (!conn) {
    conn = connectDB()
      .then(() => undefined)
      .catch((err) => {
        conn = null;
        throw err;
      });
  }

  await conn;
}

export default async function handler(req: any, res: any) {
  // Log simples para acompanhar a rota recebida pela funcao serverless
  console.log('vercel:req', { method: req?.method, url: req?.url });

  const url = req?.url || '';

  if (url.includes('healthz')) {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: true, env: process.env.NODE_ENV }));
    return;
  }

  if (url.includes('favicon.ico')) {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    await ensureDatabaseConnection();
  } catch (err: any) {
    console.error('db-connection-error', err?.message || err);
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Falha ao conectar ao banco',
        detail: err?.message || String(err)
      })
    );
    return;
  }

  return app(req, res);
}
