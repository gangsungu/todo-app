import type { Task } from '../types';

export function calculateWeightedProgress(
  taskId: string,
  tasks: Task[],
  getChildren: (parentId: string) => Task[],
): { progress: number; totalWeight: number } {
  const children = getChildren(taskId);
  if (children.length === 0) {
    const task = tasks.find(t => t.id === taskId);
    return { progress: task?.progress || 0, totalWeight: 100 };
  }

  const totalWeight = children.reduce((sum, child) => sum + (child.weight || 0), 0);
  const weightedProgress = children.reduce((sum, child) => {
    const childWeight = child.weight || 0;
    const childProgress = child.progress || 0;
    return sum + (childProgress * childWeight / 100);
  }, 0);

  return { progress: Math.round(weightedProgress), totalWeight };
}
