import { useState, useEffect, useCallback } from 'react';
import { TaskList } from './components/task-list';
import { GanttChart } from './components/gantt-chart';
import { MobileTaskList } from './components/mobile-task-list';
import { MobileGanttChart } from './components/mobile-gantt-chart';
import { ListTodo, BarChart3 } from 'lucide-react';
import { useMediaQuery } from './hooks/use-media-query';
import { useTodos } from './hooks/use-todos';
import { useMigration } from './hooks/use-migration';
import { hasGuestTasks, isMigrationLocked } from './hooks/guest-storage';
import { logout } from '@/features/auth/auth.api';

export default function App() {
  const { tasks, loading, error, isGuest, handleAddTask, handleUpdateTask, handleDeleteTask, refetch } = useTodos();
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const onMigrationComplete = useCallback(() => {
    setShowMigrationBanner(false);
    refetch();
  }, [refetch]);
  const { migrate, isMigrating } = useMigration(onMigrationComplete);

  useEffect(() => {
    if (!loading && !isGuest && hasGuestTasks()) {
      if (isMigrationLocked()) {
        migrate();
      } else {
        setShowMigrationBanner(true);
      }
    }
  }, [loading, isGuest, migrate]);
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
          {isGuest ? (
            <a href="/login" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
              Sign in
            </a>
          ) : (
            <button onClick={() => logout().then(() => window.location.href = '/')} className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
              Logout
            </button>
          )}
        </header>
        {showMigrationBanner && (
          <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2.5 flex items-center justify-between gap-3">
            <p className="text-xs text-indigo-700">이전에 작성한 작업을 가져올까요?</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowMigrationBanner(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                건너뛰기
              </button>
              <button
                onClick={migrate}
                disabled={isMigrating}
                className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 py-1 rounded-md transition-colors"
              >
                {isMigrating ? '가져오는 중...' : '가져오기'}
              </button>
            </div>
          </div>
        )}

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
          {isGuest ? (
            <a href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
              Sign in
            </a>
          ) : (
            <button onClick={() => logout().then(() => window.location.href = '/')} className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
              Logout
            </button>
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

      {showMigrationBanner && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-2.5 flex items-center justify-between">
          <p className="text-sm text-indigo-700">이전에 작성한 작업을 현재 계정으로 가져올까요?</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMigrationBanner(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              건너뛰기
            </button>
            <button
              onClick={migrate}
              disabled={isMigrating}
              className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-1.5 rounded-md transition-colors"
            >
              {isMigrating ? '가져오는 중...' : '가져오기'}
            </button>
          </div>
        </div>
      )}

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
