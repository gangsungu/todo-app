import { apiFetch } from '@/lib/api';

export type TodoStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';

export type TodoApiResponse = {
  id: number;
  title: string;
  completed: boolean;
  status: TodoStatus;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  color: string | null;
  weight: number | null;
  parentId: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateTodoRequest = {
  title: string;
  parentId?: number | null;
  sortOrder?: number | null;
  status?: TodoStatus;
  progress?: number;
  startDate?: string | null;
  endDate?: string | null;
  color?: string | null;
  weight?: number | null;
};

export type UpdateTodoRequest = {
  title: string;
  status: TodoStatus;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  color: string | null;
};

export async function fetchTodos() {
  return apiFetch<TodoApiResponse[]>('/api/todos', { method: 'GET' });
}

export async function createTodo(body: CreateTodoRequest) {
  return apiFetch<TodoApiResponse>('/api/todos', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateTodo(id: number, body: UpdateTodoRequest) {
  return apiFetch<TodoApiResponse>(`/api/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteTodo(id: number) {
  return apiFetch<void>(`/api/todos/${id}`, { method: 'DELETE' });
}

export type BulkCreateTodoItem = {
  clientTempId: string;
  parentClientTempId: string | null;
  title: string;
  sortOrder?: number | null;
  status?: TodoStatus;
  progress?: number;
  startDate?: string | null;
  endDate?: string | null;
  color?: string | null;
  weight?: number | null;
};

export async function bulkCreateTodos(items: BulkCreateTodoItem[]) {
  return apiFetch<TodoApiResponse[]>('/api/todos/bulk', {
    method: 'POST',
    body: JSON.stringify(items),
  });
}

export async function updateWeights(items: { id: number; weight: number }[]) {
  return apiFetch<TodoApiResponse[]>('/api/todos/weights', {
    method: 'PATCH',
    body: JSON.stringify(items),
  });
}
