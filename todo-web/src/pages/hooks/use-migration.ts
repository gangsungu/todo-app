import { useState, useCallback } from 'react';
import type { Task } from '../types';
import { bulkCreateTodos } from '@/features/todos/todo.api';
import { loadGuestTasks, clearGuestTasks } from './guest-storage';

function toBackendStatus(status: Task['status']) {
  switch (status) {
    case 'in-progress': return 'IN_PROGRESS' as const;
    case 'completed':   return 'COMPLETED' as const;
    default:            return 'TODO' as const;
  }
}

// 부모가 자식보다 먼저 오도록 정렬
function topologicalSort(tasks: Task[]): Task[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const result: Task[] = [];
  const visited = new Set<string>();

  function visit(task: Task) {
    if (visited.has(task.id)) return;
    if (task.parentId && taskMap.has(task.parentId)) {
      visit(taskMap.get(task.parentId)!);
    }
    visited.add(task.id);
    result.push(task);
  }

  for (const task of tasks) visit(task);
  return result;
}

export function useMigration(onComplete: () => void) {
  const [isMigrating, setIsMigrating] = useState(false);

  const migrate = useCallback(async () => {
    const guestTasks = loadGuestTasks();
    if (guestTasks.length === 0) return;

    setIsMigrating(true);

    const items = topologicalSort(guestTasks).map(task => ({
      clientTempId: task.id,
      parentClientTempId: task.parentId ?? null,
      title: task.name,
      status: toBackendStatus(task.status),
      progress: task.progress,
      startDate: task.startDate.toISOString().split('T')[0],
      endDate: task.endDate.toISOString().split('T')[0],
      color: task.color,
      weight: task.weight ?? null,
    }));

    await bulkCreateTodos(items);

    clearGuestTasks();
    setIsMigrating(false);
    onComplete();
  }, [onComplete]);

  return { migrate, isMigrating };
}
