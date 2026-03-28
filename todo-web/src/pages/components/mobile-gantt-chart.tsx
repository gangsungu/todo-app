import { differenceInDays, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task } from '../types';
import { calculateWeightedProgress } from '../utils/task-progress';
import { useTaskTree } from '../hooks/use-task-tree';
import { useMonthNavigation } from '../hooks/use-month-navigation';

interface MobileGanttChartProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
}

export function MobileGanttChart({ tasks, selectedTaskId, onSelectTask }: MobileGanttChartProps) {
  const { currentMonth, startDate, endDate, days, previousMonth, nextMonth, todayMonth } = useMonthNavigation();
  const taskHierarchy = useTaskTree(tasks);

  const getTaskPosition = (task: Task) => {
    const dayWidth = 32;
    const taskStart = task.startDate > startDate ? task.startDate : startDate;
    const taskEnd = task.endDate < endDate ? task.endDate : endDate;

    const startOffset = differenceInDays(taskStart, startDate);
    const duration = differenceInDays(taskEnd, taskStart) + 1;

    return {
      left: startOffset * dayWidth,
      width: duration * dayWidth,
    };
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
  };

  return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-4 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <button
                onClick={todayMonth}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              오늘
            </button>
            <div className="flex items-center gap-3">
              <button
                  onClick={previousMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <span className="min-w-[100px] text-center font-semibold text-lg">
              {format(currentMonth, 'yyyy.M', { locale: ko })}
            </span>
              <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 border-b">
              <div className="flex">
                {days.map((day) => (
                    <div
                        key={day.toISOString()}
                        className={`w-[32px] flex-shrink-0 py-2 text-center border-r ${
                            isToday(day) ? 'bg-blue-50' : ''
                        }`}
                    >
                      <div className="text-[10px] text-gray-500">
                        {format(day, 'EEE', { locale: ko })}
                      </div>
                      <div
                          className={`text-sm font-medium ${
                              isToday(day) ? 'text-blue-600' : ''
                          }`}
                      >
                        {format(day, 'd')}
                      </div>
                    </div>
                ))}
              </div>
            </div>

            {/* Grid Background */}
            <div className="relative">
              <div className="absolute inset-0 flex pointer-events-none">
                {days.map((day) => (
                    <div
                        key={day.toISOString()}
                        className={`w-[32px] flex-shrink-0 border-r ${
                            isToday(day) ? 'bg-blue-50/30' : ''
                        }`}
                        style={{ height: `${Math.max(taskHierarchy.flattenedTasks.length * 70, 300)}px` }}
                    />
                ))}
              </div>

              {/* Tasks */}
              <div className="relative p-2" style={{ minHeight: `${Math.max(taskHierarchy.flattenedTasks.length * 70, 300)}px` }}>
                {taskHierarchy.flattenedTasks.map(({ task, level }, index) => {
                  const position = getTaskPosition(task);
                  const isVisible = task.endDate >= startDate && task.startDate <= endDate;

                  if (!isVisible) return null;

                  const children = taskHierarchy.getChildren(task.id);
                  const hasChildren = children.length > 0;
                  const { progress: calculatedProgress } = hasChildren
                    ? calculateWeightedProgress(task.id, tasks, taskHierarchy.getChildren)
                    : { progress: task.progress };

                  return (
                      <div
                          key={task.id}
                          className="absolute"
                          style={{
                            top: `${index * 70 + 8}px`,
                            left: `${position.left + level * 12}px`,
                            width: `${Math.max(position.width - level * 12, 32)}px`,
                            minHeight: '54px',
                          }}
                          onClick={() => onSelectTask(task.id === selectedTaskId ? null : task.id)}
                      >
                        <div
                            className={`relative h-full rounded-lg transition-all ${
                                selectedTaskId === task.id
                                    ? 'ring-2 ring-blue-500 ring-offset-2'
                                    : 'shadow-sm'
                            } ${hasChildren ? 'opacity-90' : ''}`}
                            style={{
                              backgroundColor: task.color + (hasChildren ? '15' : '20'),
                              borderLeft: `3px solid ${task.color}`,
                              borderStyle: hasChildren ? 'dashed' : 'solid',
                            }}
                        >
                          <div className="px-2 py-2 h-full flex flex-col justify-center">
                            <div className="flex items-center gap-1 mb-1">
                              {level > 0 && (
                                  <span className="text-xs text-gray-400">└</span>
                              )}
                              <div className="text-xs font-medium truncate" style={{ color: task.color }}>
                                {task.name}
                              </div>
                              {hasChildren && (
                                  <span className="text-[9px] text-gray-500 bg-white/60 px-1 rounded flex-shrink-0">
                              {children.length}
                            </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="flex-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full transition-all"
                                    style={{
                                      width: `${calculatedProgress}%`,
                                      backgroundColor: task.color,
                                    }}
                                />
                              </div>
                              <span className="text-[9px] flex-shrink-0" style={{ color: task.color }}>
                            {calculatedProgress}%
                          </span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1 truncate">
                              {format(task.startDate, 'M/d')} - {format(task.endDate, 'M/d')}
                            </div>
                          </div>
                        </div>
                      </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Task Detail */}
        {selectedTaskId && tasks.find(t => t.id === selectedTaskId) && (
            <div className="border-t bg-white p-4">
              {(() => {
                const task = tasks.find(t => t.id === selectedTaskId)!;
                const children = taskHierarchy.getChildren(task.id);
                const hasChildren = children.length > 0;
                const calculatedProgress = hasChildren ? calculateWeightedProgress(task.id) : task.progress;

                return (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">{task.name}</h3>
                        <button
                            onClick={() => onSelectTask(null)}
                            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                        >
                          ×
                        </button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">기간</span>
                          <span className="font-medium">
                      {format(task.startDate, 'yyyy.M.d')} - {format(task.endDate, 'yyyy.M.d')}
                    </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">진행률</span>
                          <span className="font-medium">{calculatedProgress}%</span>
                        </div>
                        {task.weight !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">가중치</span>
                              <span className="font-medium">{task.weight}%</span>
                            </div>
                        )}
                        {hasChildren && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">하위 작업</span>
                              <span className="font-medium">{children.length}개</span>
                            </div>
                        )}
                      </div>
                    </div>
                );
              })()}
            </div>
        )}
      </div>
  );
}
