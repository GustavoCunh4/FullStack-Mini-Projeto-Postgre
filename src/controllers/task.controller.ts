import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  createTask,
  listTasks,
  findTask,
  replaceTask,
  updateTask,
  deleteTask,
  TaskPayload
} from '../services/task.service';
import { logger } from '../utils/logger';

function getUserId(req: AuthRequest) {
  const userId = req.user?.sub as string | undefined;
  if (!userId) {
    const err: any = new Error('Usuario nao autenticado');
    err.status = 401;
    throw err;
  }
  return userId;
}

export async function createTaskController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const payload: TaskPayload = req.body;
    const task = await createTask(userId, payload);
    logger.info(`Task criada: ${task.id} por usuario ${userId}`);
    return res.status(201).json({ message: 'Tarefa criada', task });
  } catch (err: any) {
    logger.warn(`Falha ao criar task: ${err.message}`);
    next(err);
  }
}

export async function listTasksController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const tasks = await listTasks(userId, {
      status: req.query.status as any,
      priority: req.query.priority as any,
      title: req.query.title as string | undefined,
      dueDate: req.query.dueDate as string | undefined
    });
    logger.info(`Listagem de tasks para usuario ${userId}: ${tasks.length} itens`);
    return res.status(200).json({ tasks });
  } catch (err: any) {
    logger.warn(`Falha ao listar tasks: ${err.message}`);
    next(err);
  }
}

export async function getTaskController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const task = await findTask(userId, req.params.id);
    logger.info(`Task consultada: ${task.id} por usuario ${userId}`);
    return res.status(200).json({ task });
  } catch (err: any) {
    logger.warn(`Falha ao buscar task: ${err.message}`);
    next(err);
  }
}

export async function replaceTaskController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const task = await replaceTask(userId, req.params.id, req.body);
    logger.info(`Task substituida: ${task.id} por usuario ${userId}`);
    return res.status(200).json({ message: 'Tarefa atualizada', task });
  } catch (err: any) {
    logger.warn(`Falha ao substituir task: ${err.message}`);
    next(err);
  }
}

export async function updateTaskController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const task = await updateTask(userId, req.params.id, req.body);
    logger.info(`Task atualizada parcialmente: ${task.id} por usuario ${userId}`);
    return res.status(200).json({ message: 'Tarefa atualizada', task });
  } catch (err: any) {
    logger.warn(`Falha ao atualizar task: ${err.message}`);
    next(err);
  }
}

export async function deleteTaskController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    await deleteTask(userId, req.params.id);
    logger.info(`Task removida: ${req.params.id} por usuario ${userId}`);
    return res.status(204).send();
  } catch (err: any) {
    logger.warn(`Falha ao remover task: ${err.message}`);
    next(err);
  }
}
