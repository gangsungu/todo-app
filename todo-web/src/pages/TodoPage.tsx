import { useState } from 'react';
import { TaskList } from './components/task-list';
import { GanttChart } from './components/gantt-chart';
import { MobileTaskList } from './components/mobile-task-list';
import { MobileGanttChart } from './components/mobile-gantt-chart';
import { ListTodo, BarChart3 } from 'lucide-react';
import { useMediaQuery } from './hooks/use-media-query';
import { useTodos } from './hooks/use-todos';

export default function App() {
  const { tasks, loading, error, isGuest, handleAddTask, handleUpdateTask, handleDeleteTask } = useTodos();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('gantt');

  const isMobile = useMediaQuery('(max-width: 768px)');

  if (loading) {
    return (
      <div className="size-full flex items-center justify-center text-gray-400">
        불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="size-full flex items-center justify-center text-red-500">
        오류: {error}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="size-full flex flex-col bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Gantodo</h1>
          {isGuest && (
            <a
              href="/login"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Sign in
            </a>
          )}
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

        <div className="bg-white border-t border-gray-200">
          <div className="flex items-center">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                viewMode === 'list' ? 'text-indigo-600' : 'text-gray-400'
              }`}
            >
              <ListTodo className="w-5 h-5" />
              <span className="text-xs font-medium">Tasks</span>
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                viewMode === 'gantt' ? 'text-indigo-600' : 'text-gray-400'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-xs font-medium">Timeline</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full flex flex-col bg-white">
      <header className="border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Gantodo</h1>
        <div className="flex items-center gap-3">
          {isGuest && (
            <a
              href="/login"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Sign in
            </a>
          )}
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'gantt'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Timeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              Tasks
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {viewMode === 'list' ? (
          <div className="h-full flex">
            <div className="w-80 flex-shrink-0">
              <TaskList
                tasks={tasks}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                selectedTaskId={selectedTaskId}
                onSelectTask={setSelectedTaskId}
              />
            </div>
            <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
              Select a task to view details
            </div>
          </div>
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
