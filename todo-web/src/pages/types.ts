export interface Task {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: 'todo' | 'in-progress' | 'completed';
  color: string;
  parentId?: string;
  weight?: number; // 부모 작업에서의 가중치 (0-100)
}