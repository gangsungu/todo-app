import { useMemo, useRef, useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task } from '../types';

interface GanttChartProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  onUpdateTask: (id: string, task: Partial<Task>) => void;
}

export function GanttChart({ tasks, selectedTaskId, onSelectTask, onUpdateTask }: GanttChartProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dragState, setDragState] = useState<{
    taskId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    originalStart: Date;
    originalEnd: Date;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 작업들을 계층 구조로 구성
  const taskHierarchy = useMemo(() => {
    const rootTasks = tasks.filter(task => !task.parentId);
    const getChildren = (parentId: string): Task[] => {
      return tasks.filter(task => task.parentId === parentId);
    };

    // 계층 구조를 평탄화하여 렌더링 순서 결정
    const flattenedTasks: Array<{ task: Task; level: number }> = [];
    const flatten = (task: Task, level: number) => {
      flattenedTasks.push({ task, level });
      const children = getChildren(task.id);
      children.forEach(child => flatten(child, level + 1));
    };

    rootTasks.forEach(task => flatten(task, 0));

    return { flattenedTasks, getChildren };
  }, [tasks]);

  const { startDate, endDate, days } = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const daysArray = eachDayOfInterval({ start, end });
    return { startDate: start, endDate: end, days: daysArray };
  }, [currentMonth]);

  const previousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
  };

  const todayMonth = () => {
    setCurrentMonth(new Date());
  };

  const getTaskPosition = (task: Task) => {
    const dayWidth = 40;
    const taskStart = task.startDate > startDate ? task.startDate : startDate;
    const taskEnd = task.endDate < endDate ? task.endDate : endDate;

    const startOffset = differenceInDays(taskStart, startDate);
    const duration = differenceInDays(taskEnd, taskStart) + 1;

    return {
      left: startOffset * dayWidth,
      width: duration * dayWidth,
    };
  };

  const handleMouseDown = (
      e: React.MouseEvent,
      task: Task,
      type: 'move' | 'resize-start' | 'resize-end'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({
      taskId: task.id,
      type,
      startX: e.clientX,
      originalStart: task.startDate,
      originalEnd: task.endDate,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dayWidth = 40;
      const deltaX = e.clientX - dragState.startX;
      const daysDelta = Math.round(deltaX / dayWidth);

      if (daysDelta === 0) return;

      const task = tasks.find((t) => t.id === dragState.taskId);
      if (!task) return;

      let newStart = dragState.originalStart;
      let newEnd = dragState.originalEnd;

      if (dragState.type === 'move') {
        newStart = addDays(dragState.originalStart, daysDelta);
        newEnd = addDays(dragState.originalEnd, daysDelta);
      } else if (dragState.type === 'resize-start') {
        newStart = addDays(dragState.originalStart, daysDelta);
        if (newStart >= dragState.originalEnd) {
          newStart = addDays(dragState.originalEnd, -1);
        }
      } else if (dragState.type === 'resize-end') {
        newEnd = addDays(dragState.originalEnd, daysDelta);
        if (newEnd <= dragState.originalStart) {
          newEnd = addDays(dragState.originalStart, 1);
        }
      }

      onUpdateTask(dragState.taskId, {
        startDate: newStart,
        endDate: newEnd,
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

  // 가중치 기반 진행률 계산
  const calculateWeightedProgress = (taskId: string): number => {
    const children = taskHierarchy.getChildren(taskId);
    if (children.length === 0) {
      const task = tasks.find(t => t.id === taskId);
      return task?.progress || 0;
    }

    const weightedProgress = children.reduce((sum, child) => {
      const childWeight = child.weight || 0;
      const childProgress = child.progress || 0;
      return sum + (childProgress * childWeight / 100);
    }, 0);

    return Math.round(weightedProgress);
  };

  return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">타임라인</h2>
            <div className="flex items-center gap-2">
              <button
                  onClick={todayMonth}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                오늘
              </button>
              <button
                  onClick={previousMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="min-w-[120px] text-center font-medium">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </span>
              <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto" ref={scrollRef}>
          <div className="min-w-max">
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 border-b">
              <div className="flex">
                {days.map((day) => (
                    <div
                        key={day.toISOString()}
                        className={`w-[40px] flex-shrink-0 p-2 text-center border-r ${
                            isToday(day) ? 'bg-blue-50' : ''
                        }`}
                    >
                      <div className="text-xs text-gray-500">
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
                        className={`w-[40px] flex-shrink-0 border-r ${
                            isToday(day) ? 'bg-blue-50/30' : ''
                        }`}
                        style={{ height: `${Math.max(taskHierarchy.flattenedTasks.length * 60, 300)}px` }}
                    />
                ))}
              </div>

              {/* Tasks */}
              <div className="relative" style={{ minHeight: `${Math.max(taskHierarchy.flattenedTasks.length * 60, 300)}px` }}>
                {taskHierarchy.flattenedTasks.map(({ task, level }, index) => {
                  const position = getTaskPosition(task);
                  const isVisible =
                      task.endDate >= startDate && task.startDate <= endDate;

                  if (!isVisible) return null;

                  const children = taskHierarchy.getChildren(task.id);
                  const hasChildren = children.length > 0;
                  const calculatedProgress = hasChildren ? calculateWeightedProgress(task.id) : task.progress;

                  return (
                      <div
                          key={task.id}
                          className="absolute"
                          style={{
                            top: `${index * 60 + 10}px`,
                            left: `${position.left + level * 20}px`,
                            width: `${position.width - level * 20}px`,
                            height: '40px',
                          }}
                          onClick={() => onSelectTask(task.id === selectedTaskId ? null : task.id)}
                      >
                        <div
                            className={`relative h-full rounded-lg transition-all ${
                                hasChildren ? 'cursor-default' : 'cursor-move'
                            } group ${
                                selectedTaskId === task.id
                                    ? 'ring-2 ring-blue-500 ring-offset-2'
                                    : 'hover:shadow-lg'
                            } ${hasChildren ? 'opacity-90' : ''}`}
                            style={{
                              backgroundColor: task.color + (hasChildren ? '15' : '20'),
                              borderLeft: `4px solid ${task.color}`,
                              borderStyle: hasChildren ? 'dashed' : 'solid',
                            }}
                            onMouseDown={(e) => {
                              if (!hasChildren) {
                                handleMouseDown(e, task, 'move');
                              }
                            }}
                        >
                          {/* Resize handle - left (하위 작업이 없을 때만) */}
                          {!hasChildren && (
                              <div
                                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ backgroundColor: task.color }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    handleMouseDown(e, task, 'resize-start');
                                  }}
                              />
                          )}

                          {/* Task content */}
                          <div className="px-2 py-1 h-full flex flex-col justify-center">
                            <div className="flex items-center gap-1">
                              {level > 0 && (
                                  <span className="text-xs text-gray-400">└</span>
                              )}
                              <div className="text-xs font-medium truncate" style={{ color: task.color }}>
                                {task.name}
                              </div>
                              {hasChildren && (
                                  <span className="text-[10px] text-gray-500 bg-white/60 px-1 rounded">
                              {children.length}
                            </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="flex-1 h-1 bg-white/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full transition-all"
                                    style={{
                                      width: `${calculatedProgress}%`,
                                      backgroundColor: task.color,
                                    }}
                                />
                              </div>
                              <span className="text-[10px]" style={{ color: task.color }}>
                            {calculatedProgress}%
                          </span>
                            </div>
                          </div>

                          {/* Resize handle - right (하위 작업이 없을 때만) */}
                          {!hasChildren && (
                              <div
                                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ backgroundColor: task.color }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    handleMouseDown(e, task, 'resize-end');
                                  }}
                              />
                          )}
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