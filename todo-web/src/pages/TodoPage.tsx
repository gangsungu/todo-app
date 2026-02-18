import { useState, useEffect } from 'react';
import { TaskList } from './components/task-list';
import { GanttChart } from './components/gantt-chart';
import { MobileTaskList } from './components/mobile-task-list';
import { MobileGanttChart } from './components/mobile-gantt-chart';
import { ListTodo, BarChart3 } from 'lucide-react';
import { useMediaQuery } from './hooks/use-media-query';
import type { Task } from './types';

import { createTodo, deleteTodo, fetchTodoTree, type TodoTreeNode } from '@/features/todos/todo.api';

/** 트리 응답을 플랫 Task 배열로 변환 */
function flattenTree(nodes: TodoTreeNode[], parentId?: string): Task[] {
  const result: Task[] = [];
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  for (const node of nodes) {
    const id = String(node.id);
    result.push({
      id,
      name: node.title,
      startDate: today,
      endDate: nextWeek,
      progress: node.description ? 100 : 0, // description = completed
      status: node.description ? 'completed' : 'todo',
      color: '#3b82f6',
      parentId,
      weight: node.sortOrder,
    });

    if (node.children.length > 0) {
      result.push(...flattenTree(node.children, id));
    }
  }
  return result;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');

  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    fetchTodoTree()
      .then((tree) => setTasks(flattenTree(tree)))
      .catch((e) => console.error('트리 조회 실패', e));
  }, []);

  const handleAddTask = async (newTask: Omit<Task, 'id'>) => {
    try {
      const saved = await createTodo({
        title: newTask.name,
        parentId: newTask.parentId ? Number(newTask.parentId) : null,
        sortOrder: newTask.weight ?? 0,
      });

      const task: Task = {
        ...newTask,
        id: String(saved.id),
      };

      setTasks((prev) => [...prev, task]);
    }
    catch(e) {
      console.error(e);
      alert("할 일 추가 실패");
    }
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, ...updates } : task)));
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTodo(Number(id));

      // 삭제된 항목과 모든 자식(서브트리)을 state에서 제거
      const toRemove = new Set<string>();
      const collect = (taskId: string) => {
        toRemove.add(taskId);
        tasks.filter((t) => t.parentId === taskId).forEach((child) => collect(child.id));
      };
      collect(id);

      setTasks((prev) => prev.filter((t) => !toRemove.has(t.id)));
      if (selectedTaskId && toRemove.has(selectedTaskId)) {
        setSelectedTaskId(null);
      }
    } catch (e) {
      console.error(e);
      alert('삭제 실패');
    }
  };

  if (isMobile) {
    return (
        <div className="size-full flex flex-col bg-gray-50">
          <header className="bg-white border-b px-4 py-3 sticky top-0 z-20">
            <h1 className="text-xl font-bold text-gray-900">프로젝트 관리</h1>
          </header>

          <div className="flex-1 overflow-hidden">
            {viewMode === 'list' ? (
                <MobileTaskList
                    tasks={tasks}
                    onAddTask={handleAddTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    selectedTaskId={selectedTaskId}
                    onSelectTask={setSelectedTaskId}
                />
            ) : (
                <MobileGanttChart
                    tasks={tasks}
                    selectedTaskId={selectedTaskId}
                    onSelectTask={setSelectedTaskId}
                />
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="bg-white border-t">
            <div className="flex items-center">
              <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                      viewMode === 'list'
                          ? 'text-blue-600'
                          : 'text-gray-400'
                  }`}
              >
                <ListTodo className="w-6 h-6" />
                <span className="text-xs font-medium">작업 목록</span>
              </button>
              <button
                  onClick={() => setViewMode('gantt')}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                      viewMode === 'gantt'
                          ? 'text-blue-600'
                          : 'text-gray-400'
                  }`}
              >
                <BarChart3 className="w-6 h-6" />
                <span className="text-xs font-medium">간트 차트</span>
              </button>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="size-full flex flex-col bg-gray-50">
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">프로젝트 관리</h1>
              <p className="text-sm text-gray-600 mt-1">간트 차트와 투두리스트를 한 곳에서</p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                      viewMode === 'list'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <ListTodo className="w-5 h-5" />
                <span className="font-medium">작업 목록</span>
              </button>
              <button
                  onClick={() => setViewMode('gantt')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                      viewMode === 'gantt'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">간트 차트</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-white">
          {viewMode === 'list' ? (
              <TaskList
                  tasks={tasks}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={setSelectedTaskId}
              />
          ) : (
              <GanttChart
                  tasks={tasks}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={setSelectedTaskId}
                  onUpdateTask={handleUpdateTask}
              />
          )}
        </div>
      </div>
  );
}