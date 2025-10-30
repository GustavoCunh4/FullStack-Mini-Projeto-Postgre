import { randomUUID } from 'crypto';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: Date | string | null;
  priority?: TaskPriority;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  title?: string;
  dueDate?: string;
}

export interface Task {
  id: string;
  user: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: Date | null;
  priority: TaskPriority;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: Date | string | null;
  priority: TaskPriority;
  created_at: Date | string;
  updated_at: Date | string;
};

export function createTaskId() {
  return randomUUID();
}
