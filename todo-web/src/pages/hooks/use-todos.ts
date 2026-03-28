import { useState, useEffect, useCallback } from 'react';
import type { Task } from '../types';
import {
  fetchTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  type TodoApiResponse,
} from '@/features/todos/todo.api';
import { DESKTOP_TASK_DEFAULTS } from '../utils/task-defaults';

function toTask(t: TodoApiResponse): Task {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + DESKTOP_TASK_DEFAULTS.defaultDurationDays);

  return {
    id: String(t.id),
    name: t.title,
    startDate: t.startDate ? new Date(t.startDate) : today,
    endDate: t.endDate ? new Date(t.endDate) : endDate,
    progress: t.progress,
    status: toFrontendStatus(t.status),
    color: t.color ?? DESKTOP_TASK_DEFAULTS.color,
    parentId: t.parentId != null ? String(t.parentId) : undefined,
    weight: t.weight ?? undefined,
  };
}

function toFrontendStatus(status: TodoApiResponse['status']): Task['status'] {
  switch (status) {
    case 'IN_PROGRESS': return 'in-progress';
    case 'COMPLETED':   return 'completed';
    default:            return 'todo';
  }
}

function toBackendStatus(status: Task['status']): TodoApiResponse['status'] {
  switch (status) {
    case 'in-progress': return 'IN_PROGRESS';
    case 'completed':   return 'COMPLETED';
    default:            return 'TODO';
  }
}

export function useTodos() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTodos()
      .then((data) => setTasks(data.map(toTask)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAddTask = useCallback(async (newTask: Omit<Task, 'id'>) => {
    const created = await createTodo({
      title: newTask.name,
      parentId: newTask.parentId ? Number(newTask.parentId) : null,
      status: toBackendStatus(newTask.status),
      progress: newTask.progress,
      startDate: newTask.startDate.toISOString().split('T')[0],
      endDate: newTask.endDate.toISOString().split('T')[0],
      color: newTask.color,
      weight: newTask.weight ?? null,
    });
    setTasks((prev) => [...prev, toTask(created)]);
  }, []);

  const handleUpdateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );

    const current = tasks.find((t) => t.id === id);
    if (!current) return;
    const merged = { ...current, ...updates };

    await updateTodo(Number(id), {
      title: merged.name,
      status: toBackendStatus(merged.status),
      progress: merged.progress,
      startDate: merged.startDate.toISOString().split('T')[0],
      endDate: merged.endDate.toISOString().split('T')[0],
      color: merged.color,
      weight: merged.weight ?? null,
    });
  }, [tasks]);

  const handleDeleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await deleteTodo(Number(id));
  }, []);

  return { tasks, loading, error, handleAddTask, handleUpdateTask, handleDeleteTask };
}
