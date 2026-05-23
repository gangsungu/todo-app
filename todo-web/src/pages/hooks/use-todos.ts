import { useState, useEffect, useCallback } from 'react';
import type { Task } from '../types';
import {
  fetchTodos,
  createTodo,
  updateTodo,
  updateWeights,
  deleteTodo,
  type TodoApiResponse,
} from '@/features/todos/todo.api';
import { DESKTOP_TASK_DEFAULTS } from '../utils/task-defaults';
import { loadGuestTasks, saveGuestTasks } from './guest-storage';
import { checkAuth } from '@/features/auth/auth.api';

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
  const [actionError, setActionError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    checkAuth()
      .then((auth) => {
        if (!auth.authenticated) {
          setIsGuest(true);
          setTasks(loadGuestTasks());
          return;
        }
        return fetchTodos().then((data) => setTasks(data.map(toTask)));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddTask = useCallback(async (newTask: Omit<Task, 'id'>) => {
    if (isGuest) {
      const task: Task = { ...newTask, id: crypto.randomUUID() };
      setTasks(prev => {
        const next = [...prev, task];
        saveGuestTasks(next);
        return next;
      });
      return;
    }
    try {
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
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '할일 생성에 실패했습니다.');
    }
  }, [isGuest]);

  const handleUpdateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    if (isGuest) {
      setTasks(prev => {
        const next = prev.map(t => t.id === id ? { ...t, ...updates } : t);
        saveGuestTasks(next);
        return next;
      });
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    const current = tasks.find((t) => t.id === id);
    if (!current) return;
    const merged = { ...current, ...updates };
    try {
      await updateTodo(Number(id), {
        title: merged.name,
        status: toBackendStatus(merged.status),
        progress: merged.progress,
        startDate: merged.startDate.toISOString().split('T')[0],
        endDate: merged.endDate.toISOString().split('T')[0],
        color: merged.color,
      });
      if (updates.status === 'completed' || updates.status === 'todo') {
        await load();
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '할일 수정에 실패했습니다.');
      await load(); // 낙관적 업데이트 롤백
    }
  }, [isGuest, tasks, load]);

  const handleDeleteTask = useCallback(async (id: string) => {
    if (isGuest) {
      setTasks(prev => {
        const next = prev.filter(t => t.id !== id);
        saveGuestTasks(next);
        return next;
      });
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await deleteTodo(Number(id));
  }, [isGuest]);

  const handleUpdateWeights = useCallback(async (updates: { id: string; weight: number }[]) => {
    if (isGuest) {
      setTasks(prev => {
        const map = new Map(updates.map(u => [u.id, u.weight]));
        const next = prev.map(t => map.has(t.id) ? { ...t, weight: map.get(t.id) } : t);
        saveGuestTasks(next);
        return next;
      });
      return;
    }

    const updatesMap = new Map(updates.map(u => [u.id, u.weight]));
    setTasks(prev => prev.map(t => updatesMap.has(t.id) ? { ...t, weight: updatesMap.get(t.id) } : t));

    try {
      const updated = await updateWeights(updates.map(u => ({ id: Number(u.id), weight: u.weight })));
      const updatedMap = new Map(updated.map(t => [String(t.id), toTask(t)]));
      setTasks(prev => prev.map(t => updatedMap.has(t.id) ? updatedMap.get(t.id)! : t));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '가중치 수정에 실패했습니다.');
      await load();
    }
  }, [isGuest, load]);

  const clearActionError = useCallback(() => setActionError(null), []);

  return { tasks, loading, error, actionError, clearActionError, isGuest, handleAddTask, handleUpdateTask, handleUpdateWeights, handleDeleteTask, refetch: load };
}
