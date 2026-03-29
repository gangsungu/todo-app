import { useRef, useEffect, useState } from 'react';
import { format, differenceInDays, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task } from '../types';
import { calculateWeightedProgress } from '../utils/task-progress';
import { useTaskTree } from '../hooks/use-task-tree';
import { useMonthNavigation } from '../hooks/use-month-navigation';

interface GanttChartProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  onUpdateTask: (id: string, task: Partial<Task>) => void;
}

export function GanttChart({ tasks, selectedTaskId, onSelectTask, onUpdateTask }: GanttChartProps) {
  const { currentMonth, startDate, endDate, days, previousMonth, nextMonth, todayMonth } = useMonthNavigation();
  const [dragState, setDragState] = useState<{
    taskId: string;
    type: 'move';
    startX: number;
    originalStart: Date;
    originalEnd: Date;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const taskHierarchy = useTaskTree(tasks);

  const getTaskPosition = (task: Task) => {
    const dayWidth = 48;
    const taskStart = task.startDate > startDate ? task.startDate : startDate;
    const taskEnd = task.endDate < endDate ? task.endDate : endDate;

    const startOffset = differenceInDays(taskStart, startDate);
    const duration = differenceInDays(taskEnd, taskStart) + 1;

    return {
      left: startOffset * dayWidth,
      width: duration * dayWidth,
    };
  };

  const handleMouseDown = (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({
      taskId: task.id,
      type: 'move',
      startX: e.clientX,
      originalStart: task.startDate,
      originalEnd: task.endDate,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dayWidth = 48;
      const deltaX = e.clientX - dragState.startX;
      const daysDelta = Math.round(deltaX / dayWidth);

      if (daysDelta === 0) return;

      const task = tasks.find((t) => t.id === dragState.taskId);
      if (!task) return;

      onUpdateTask(dragState.taskId, {
        startDate: addDays(dragState.originalStart, daysDelta),
        endDate: addDays(dragState.originalEnd, daysDelta),
      });
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, tasks, onUpdateTask]);

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
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <h2 className="text-sm font-medium text-gray-900">Timeline</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={todayMonth}
            className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={previousMonth}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm text-gray-700 font-medium min-w-[100px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <div className="min-w-max">
          {/* Header */}
          <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
            <div className="flex">
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`w-[48px] flex-shrink-0 py-2 text-center border-r border-gray-100 ${
                    isToday(day) ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="text-[10px] text-gray-400 uppercase">
                    {format(day, 'EEE')}
                  </div>
                  <div
                    className={`text-sm font-medium mt-0.5 ${
                      isToday(day) ? 'text-indigo-600' : 'text-gray-700'
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
                  className={`w-[48px] flex-shrink-0 border-r border-gray-100 ${
                    isToday(day) ? 'bg-indigo-50/30' : ''
                  }`}
                  style={{ height: `${Math.max(taskHierarchy.flattenedTasks.length * 48, 400)}px` }}
                />
              ))}
            </div>

            {/* Tasks */}
            <div className="relative" style={{ minHeight: `${Math.max(taskHierarchy.flattenedTasks.length * 48, 400)}px` }}>
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
                    className={`absolute select-none ${hasChildren ? 'cursor-default' : 'cursor-move'}`}
                    style={{
                      top: `${index * 48 + 12}px`,
                      left: `${position.left + level * 16}px`,
                      width: `${Math.max(position.width - level * 16, 48)}px`,
                      height: '28px',
                    }}
                    onClick={() => onSelectTask(task.id === selectedTaskId ? null : task.id)}
                  >
                    <div
                      className={`relative h-full rounded transition-all group ${
                        selectedTaskId === task.id
                          ? 'ring-2 ring-indigo-500 ring-offset-1'
                          : ''
                      }`}
                      style={{
                        backgroundColor: hasChildren ? '#f9fafb' : '#4F46E5',
                        border: hasChildren ? '1px dashed #d1d5db' : '1px solid #4338ca',
                        opacity: hasChildren ? 0.6 : 1,
                      }}
                      onMouseDown={(e) => {
                        if (!hasChildren) {
                          handleMouseDown(e, task);
                        }
                      }}
                    >
                      {/* Task content */}
                      <div className="px-2 py-1 h-full flex items-center justify-between gap-2 pointer-events-none">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span
                            className={`text-xs font-medium truncate ${
                              hasChildren ? 'text-gray-500' : 'text-white'
                            }`}
                          >
                            {task.name}
                          </span>
                          {hasChildren && (
                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                              ({children.length})
                            </span>
                          )}
                        </div>
                        {!hasChildren && (
                          <span className="text-[10px] text-indigo-100 flex-shrink-0">
                            {calculatedProgress}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
