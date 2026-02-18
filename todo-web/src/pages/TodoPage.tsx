import { useState } from 'react';
import { TaskList } from './components/task-list';
import { GanttChart } from './components/gantt-chart';
import { MobileTaskList } from './components/mobile-task-list';
import { MobileGanttChart } from './components/mobile-gantt-chart';
import { ListTodo, BarChart3 } from 'lucide-react';
import { useMediaQuery } from './hooks/use-media-query';
import type { Task } from './types';

const SAMPLE_TASKS: Task[] = [
  {
    id: '1',
    name: '프로젝트 기획',
    startDate: new Date(2026, 1, 3),
    endDate: new Date(2026, 1, 10),
    progress: 0,
    status: 'in-progress',
    color: '#10b981',
  },
  {
    id: '1-1',
    name: '요구사항 수집 및 분석',
    startDate: new Date(2026, 1, 3),
    endDate: new Date(2026, 1, 5),
    progress: 100,
    status: 'completed',
    color: '#10b981',
    parentId: '1',
    weight: 50,
  },
  {
    id: '1-2',
    name: '개발일정 확인',
    startDate: new Date(2026, 1, 6),
    endDate: new Date(2026, 1, 8),
    progress: 0,
    status: 'todo',
    color: '#10b981',
    parentId: '1',
    weight: 30,
  },
  {
    id: '1-3',
    name: '리소스 확보',
    startDate: new Date(2026, 1, 8),
    endDate: new Date(2026, 1, 10),
    progress: 0,
    status: 'todo',
    color: '#10b981',
    parentId: '1',
    weight: 20,
  },
  {
    id: '2',
    name: 'UI/UX 디자인',
    startDate: new Date(2026, 1, 11),
    endDate: new Date(2026, 1, 18),
    progress: 0,
    status: 'todo',
    color: '#3b82f6',
  },
  {
    id: '2-1',
    name: '와이어프레임 작성',
    startDate: new Date(2026, 1, 11),
    endDate: new Date(2026, 1, 13),
    progress: 0,
    status: 'todo',
    color: '#3b82f6',
    parentId: '2',
    weight: 30,
  },
  {
    id: '2-2',
    name: '디자인 시스템 구축',
    startDate: new Date(2026, 1, 14),
    endDate: new Date(2026, 1, 16),
    progress: 0,
    status: 'todo',
    color: '#3b82f6',
    parentId: '2',
    weight: 50,
  },
  {
    id: '2-3',
    name: '최종 디자인 확정',
    startDate: new Date(2026, 1, 17),
    endDate: new Date(2026, 1, 18),
    progress: 0,
    status: 'todo',
    color: '#3b82f6',
    parentId: '2',
    weight: 20,
  },
  {
    id: '3',
    name: '프론트엔드 개발',
    startDate: new Date(2026, 1, 19),
    endDate: new Date(2026, 1, 28),
    progress: 0,
    status: 'todo',
    color: '#8b5cf6',
  },
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(SAMPLE_TASKS);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');

  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleAddTask = (newTask: Omit<Task, 'id'>) => {
    const task: Task = {
      ...newTask,
      id: Date.now().toString(),
    };
    setTasks([...tasks, task]);
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, ...updates } : task)));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
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