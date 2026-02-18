import { apiFetch } from '@/lib/api';

export type CreateTodoRequest = {
  title: string;
  parentId?: number | null;
  sortOrder?: number | null;
};

export type TodoResponse = {
  id: number;
  title: string;
  completed: boolean;
  parentId: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type TodoTreeNode = {
  id: number;
  title: string;
  description: boolean; // actually "completed"
  sortOrder: number;
  children: TodoTreeNode[];
};

export async function fetchTodoTree() {
  return apiFetch<TodoTreeNode[]>('/api/todos/tree', { method: 'GET' });
}

export async function createTodo(body: CreateTodoRequest) {
  return apiFetch<TodoResponse>('/api/todos', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteTodo(id: number) {
  return apiFetch<void>(`/api/todos/${id}`, { method: 'DELETE' });
}
