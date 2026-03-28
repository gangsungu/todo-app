import { useMemo } from 'react';
import type { Task } from '../types';

export function useTaskTree(tasks: Task[]) {
  return useMemo(() => {
    const rootTasks = tasks.filter(task => !task.parentId);

    const getChildren = (parentId: string): Task[] =>
      tasks.filter(task => task.parentId === parentId);

    const flattenedTasks: Array<{ task: Task; level: number }> = [];
    const flatten = (task: Task, level: number) => {
      flattenedTasks.push({ task, level });
      getChildren(task.id).forEach(child => flatten(child, level + 1));
    };
    rootTasks.forEach(task => flatten(task, 0));

    return { rootTasks, getChildren, flattenedTasks };
  }, [tasks]);
}
