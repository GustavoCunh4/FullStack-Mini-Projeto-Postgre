import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createTaskController,
  listTasksController,
  getTaskController,
  replaceTaskController,
  updateTaskController,
  deleteTaskController
} from '../controllers/task.controller';

const router = Router();

const statusValues = ['pending', 'in_progress', 'completed'];
const priorityValues = ['low', 'medium', 'high'];

router.use(authMiddleware);

router.post(
  '/tasks',
  body('title').isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('status').optional().isIn(statusValues),
  body('dueDate').optional({ nullable: true }).isISO8601(),
  body('priority').optional().isIn(priorityValues),
  validate,
  createTaskController
);

router.get(
  '/tasks',
  query('status').optional().isIn(statusValues),
  query('priority').optional().isIn(priorityValues),
  query('title').optional().isString().trim().isLength({ min: 1 }),
  query('dueDate').optional().isISO8601(),
  validate,
  listTasksController
);

router.get(
  '/tasks/:id',
  param('id').isUUID('4'),
  validate,
  getTaskController
);

router.put(
  '/tasks/:id',
  param('id').isUUID('4'),
  body('title').isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('status').isIn(statusValues),
  body('dueDate').optional({ nullable: true }).isISO8601(),
  body('priority').isIn(priorityValues),
  validate,
  replaceTaskController
);

router.patch(
  '/tasks/:id',
  param('id').isUUID('4'),
  body('title').optional().isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('status').optional().isIn(statusValues),
  body('dueDate').optional({ nullable: true }).isISO8601(),
  body('priority').optional().isIn(priorityValues),
  validate,
  updateTaskController
);

router.delete(
  '/tasks/:id',
  param('id').isUUID('4'),
  validate,
  deleteTaskController
);

export default router;
