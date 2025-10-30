import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { getPool } from '../database/connection';

const SALT_ROUNDS = 10;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function registerUser(name: string, email: string, password: string) {
  const pool = getPool();
  const normalizedEmail = normalizeEmail(email);

  const existing = await pool.query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1 LIMIT 1',
    [normalizedEmail]
  );

  if (existing.rows.length > 0) {
    const err: any = new Error('E-mail ja cadastrado');
    err.status = 409;
    throw err;
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = randomUUID();

  const { rows } = await pool.query<{ id: string; name: string; email: string }>(
    `
      INSERT INTO users (id, name, email, password)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email
    `,
    [userId, name.trim(), normalizedEmail, hashed]
  );

  return rows[0];
}

export async function loginUser(email: string, password: string) {
  const pool = getPool();
  const normalizedEmail = normalizeEmail(email);

  const { rows } = await pool.query<{
    id: string;
    email: string;
    password: string;
  }>(
    `
      SELECT id, email, password
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [normalizedEmail]
  );

  const user = rows[0];
  if (!user) {
    const err: any = new Error('Credenciais invalidas');
    err.status = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    const err: any = new Error('Credenciais invalidas');
    err.status = 401;
    throw err;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET nao definido no .env');
  }

  const expiresIn = process.env.JWT_EXPIRES || '1h';

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    secret,
    { expiresIn }
  );

  return { token };
}
