import { useState, useCallback } from 'react';
import type { Task } from '../types';
import { createTodo } from '@/features/todos/todo.api';
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
    // 클라이언트 UUID → 서버 ID 매핑
    const idMap = new Map<string, number>();

    for (const task of topologicalSort(guestTasks)) {
      const newParentId = task.parentId != null ? (idMap.get(task.parentId) ?? null) : null;
      const created = await createTodo({
        title: task.name,
        parentId: newParentId,
        status: toBackendStatus(task.status),
        progress: task.progress,
        startDate: task.startDate.toISOString().split('T')[0],
        endDate: task.endDate.toISOString().split('T')[0],
        color: task.color,
        weight: task.weight ?? null,
      });
      idMap.set(task.id, created.id);
    }

    clearGuestTasks();
    setIsMigrating(false);
    onComplete();
  }, [onComplete]);

  return { migrate, isMigrating };
}
