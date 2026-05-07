import type { Task } from '../types';

const STORAGE_KEY = 'guest_todos';

type StoredTask = Omit<Task, 'startDate' | 'endDate'> & {
  startDate: string;
  endDate: string;
};

export function hasGuestTasks(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

export function loadGuestTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: StoredTask[] = JSON.parse(raw);
    return parsed.map(t => ({
      ...t,
      startDate: new Date(t.startDate),
      endDate: new Date(t.endDate),
    }));
  } catch {
    return [];
  }
}

export function saveGuestTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function clearGuestTasks(): void {
  localStorage.removeItem(STORAGE_KEY);
}

const MIGRATION_LOCK_KEY = 'guest_migration_lock';

export function setMigrationLock(): void {
  localStorage.setItem(MIGRATION_LOCK_KEY, 'true');
}

export function clearMigrationLock(): void {
  localStorage.removeItem(MIGRATION_LOCK_KEY);
}

export function isMigrationLocked(): boolean {
  return localStorage.getItem(MIGRATION_LOCK_KEY) === 'true';
}
