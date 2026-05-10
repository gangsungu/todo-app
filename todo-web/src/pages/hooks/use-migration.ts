import { useState, useCallback } from 'react';
import type { Task } from '../types';
import { bulkCreateTodos } from '@/features/todos/todo.api';
import { loadGuestTasks, clearGuestTasks, setMigrationLock, clearMigrationLock } from './guest-storage';

function toBackendStatus(status: Task['status']) {
  switch (status) {
    case 'in-progress': return 'IN_PROGRESS' as const;
    case 'completed':   return 'COMPLETED' as const;
    default:            return 'TODO' as const;
  }
}

function isValidTask(task: Task): boolean {
  return (
    typeof task.name === 'string' &&
    task.name.trim().length > 0 &&
    task.name.length <= 200 &&
    task.startDate instanceof Date && !isNaN(task.startDate.getTime()) &&
    task.endDate instanceof Date && !isNaN(task.endDate.getTime()) &&
    task.startDate <= task.endDate &&
    typeof task.progress === 'number' && task.progress >= 0 && task.progress <= 100 &&
    (task.weight == null || (task.weight >= 0 && task.weight <= 100))
  );
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
    setMigrationLock();

    try {
      // 원본 배열 순서 기준으로 형제 간 sortOrder 계산
      const siblingCountMap = new Map<string | null, number>();
      const sortOrderMap = new Map<string, number>();
      for (const task of guestTasks) {
        const parentKey = task.parentId ?? null;
        const idx = siblingCountMap.get(parentKey) ?? 0;
        sortOrderMap.set(task.id, idx);
        siblingCountMap.set(parentKey, idx + 1);
      }

      const items = topologicalSort(guestTasks).filter(isValidTask).map(task => ({
        clientTempId: task.id,
        parentClientTempId: task.parentId ?? null,
        title: task.name,
        sortOrder: sortOrderMap.get(task.id) ?? 0,
        status: toBackendStatus(task.status),
        progress: task.progress,
        startDate: task.startDate.toISOString().split('T')[0],
        endDate: task.endDate.toISOString().split('T')[0],
        color: task.color,
        weight: task.weight ?? null,
      }));

      await bulkCreateTodos(items);

      clearGuestTasks();
      clearMigrationLock();
      onComplete();
    } finally {
      setIsMigrating(false);
    }
  }, [onComplete]);

  return { migrate, isMigrating };
}
