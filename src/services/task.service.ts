import { getPool } from '../database/connection';
import {
  Task,
  TaskFilters,
  TaskPayload,
  TaskPriority,
  TaskRow,
  TaskStatus,
  createTaskId
} from '../models/task.model';

export type {
  Task,
  TaskFilters,
  TaskPayload,
  TaskPriority,
  TaskStatus
} from '../models/task.model';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ensureUuid(id: string, label: string) {
  if (!UUID_REGEX.test(id)) {
    const err: any = new Error(`${label} invalido`);
    err.status = 400;
    throw err;
  }
}

function ensureOwnership(row: TaskRow, userId: string) {
  if (row.user_id !== userId) {
    const err: any = new Error('Operacao nao permitida para este recurso');
    err.status = 403;
    throw err;
  }
}

function normalizeDate(input?: string | Date | null) {
  if (input === undefined || input === null || input === '') return null;
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    const err: any = new Error('Data invalida');
    err.status = 400;
    throw err;
  }
  return date;
}

function toDate(value: Date | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  return value instanceof Date ? value : new Date(value);
}

function mapTaskRow(row: TaskRow): Task {
  const createdAt = toDate(row.created_at);
  const updatedAt = toDate(row.updated_at);

  if (!createdAt || !updatedAt) {
    throw new Error('Campos de auditoria ausentes na tarefa');
  }

  return {
    id: row.id,
    user: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status,
    dueDate: toDate(row.due_date),
    priority: row.priority,
    createdAt,
    updatedAt
  };
}

async function fetchTaskRow(taskId: string) {
  const pool = getPool();
  const { rows } = await pool.query<TaskRow>(
    `
      SELECT id, user_id, title, description, status, due_date, priority, created_at, updated_at
      FROM tasks
      WHERE id = $1
      LIMIT 1
    `,
    [taskId]
  );
  return rows[0] ?? null;
}

async function requireTaskRow(taskId: string) {
  const row = await fetchTaskRow(taskId);
  if (!row) {
    const err: any = new Error('Tarefa nao encontrada');
    err.status = 404;
    throw err;
  }
  return row;
}

export async function createTask(userId: string, payload: TaskPayload) {
  ensureUuid(userId, 'Usuario');

  const pool = getPool();
  const dueDate = normalizeDate(payload.dueDate);
  const status = payload.status ?? 'pending';
  const priority = payload.priority ?? 'medium';
  const description = payload.description ?? null;

  const { rows } = await pool.query<TaskRow>(
    `
      INSERT INTO tasks (id, user_id, title, description, status, due_date, priority)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, title, description, status, due_date, priority, created_at, updated_at
    `,
    [
      createTaskId(),
      userId,
      payload.title,
      description,
      status,
      dueDate,
      priority
    ]
  );

  return mapTaskRow(rows[0]);
}

export async function listTasks(userId: string, filters: TaskFilters) {
  ensureUuid(userId, 'Usuario');

  const pool = getPool();
  const conditions = ['user_id = $1'];
  const values: any[] = [userId];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }

  if (filters.priority) {
    values.push(filters.priority);
    conditions.push(`priority = $${values.length}`);
  }

  if (filters.title) {
    values.push(`%${filters.title}%`);
    conditions.push(`title ILIKE $${values.length}`);
  }

  if (filters.dueDate) {
    const dueDate = normalizeDate(filters.dueDate);
    if (dueDate) {
      values.push(dueDate);
      conditions.push(`DATE(due_date) = DATE($${values.length})`);
    }
  }

  const { rows } = await pool.query<TaskRow>(
    `
      SELECT id, user_id, title, description, status, due_date, priority, created_at, updated_at
      FROM tasks
      WHERE ${conditions.join(' AND ')}
      ORDER BY due_date ASC NULLS LAST, created_at DESC
    `,
    values
  );

  return rows.map(mapTaskRow);
}

export async function findTask(userId: string, taskId: string) {
  ensureUuid(userId, 'Usuario');
  ensureUuid(taskId, 'ID da tarefa');

  const row = await requireTaskRow(taskId);
  ensureOwnership(row, userId);

  return mapTaskRow(row);
}

export async function replaceTask(userId: string, taskId: string, payload: TaskPayload) {
  ensureUuid(userId, 'Usuario');
  ensureUuid(taskId, 'ID da tarefa');

  const existing = await requireTaskRow(taskId);
  ensureOwnership(existing, userId);

  const dueDate = normalizeDate(payload.dueDate);
  const status = payload.status ?? 'pending';
  const priority = payload.priority ?? 'medium';
  const description = payload.description ?? null;

  const pool = getPool();
  const { rows } = await pool.query<TaskRow>(
    `
      UPDATE tasks
      SET
        title = $3,
        description = $4,
        status = $5,
        due_date = $6,
        priority = $7,
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id, user_id, title, description, status, due_date, priority, created_at, updated_at
    `,
    [taskId, userId, payload.title, description, status, dueDate, priority]
  );

  if (rows.length === 0) {
    const err: any = new Error('Tarefa nao encontrada');
    err.status = 404;
    throw err;
  }

  return mapTaskRow(rows[0]);
}

export async function updateTask(userId: string, taskId: string, payload: Partial<TaskPayload>) {
  ensureUuid(userId, 'Usuario');
  ensureUuid(taskId, 'ID da tarefa');

  const existing = await requireTaskRow(taskId);
  ensureOwnership(existing, userId);

  const sets: string[] = [];
  const values: any[] = [];

  if (payload.title !== undefined) {
    values.push(payload.title);
    sets.push(`title = $${values.length}`);
  }

  if (payload.description !== undefined) {
    values.push(payload.description);
    sets.push(`description = $${values.length}`);
  }

  if (payload.status !== undefined) {
    values.push(payload.status);
    sets.push(`status = $${values.length}`);
  }

  if (payload.dueDate !== undefined) {
    values.push(normalizeDate(payload.dueDate));
    sets.push(`due_date = $${values.length}`);
  }

  if (payload.priority !== undefined) {
    values.push(payload.priority);
    sets.push(`priority = $${values.length}`);
  }

  if (sets.length === 0) {
    return mapTaskRow(existing);
  }

  const pool = getPool();
  values.push(taskId);
  const idParam = values.length;
  values.push(userId);
  const userParam = values.length;

  const { rows } = await pool.query<TaskRow>(
    `
      UPDATE tasks
      SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${idParam} AND user_id = $${userParam}
      RETURNING id, user_id, title, description, status, due_date, priority, created_at, updated_at
    `,
    values
  );

  if (rows.length === 0) {
    const err: any = new Error('Tarefa nao encontrada');
    err.status = 404;
    throw err;
  }

  return mapTaskRow(rows[0]);
}

export async function deleteTask(userId: string, taskId: string) {
  ensureUuid(userId, 'Usuario');
  ensureUuid(taskId, 'ID da tarefa');

  const existing = await requireTaskRow(taskId);
  ensureOwnership(existing, userId);

  const pool = getPool();
  await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [
    taskId,
    userId
  ]);

  return mapTaskRow(existing);
}
