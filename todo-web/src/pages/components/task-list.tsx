import { useState, useMemo } from 'react';
import { Plus, Trash2, Calendar, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onUpdateTask: (id: string, task: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
}

export function TaskList({
                           tasks,
                           onAddTask,
                           onUpdateTask,
                           onDeleteTask,
                           selectedTaskId,
                           onSelectTask,
                         }: TaskListProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [addingSubtaskToId, setAddingSubtaskToId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskWeight, setNewTaskWeight] = useState(100);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // 작업들을 계층 구조로 구성
  const taskHierarchy = useMemo(() => {
    const rootTasks = tasks.filter(task => !task.parentId);
    const getChildren = (parentId: string): Task[] => {
      return tasks.filter(task => task.parentId === parentId);
    };

    return { rootTasks, getChildren };
  }, [tasks]);

  // 가중치 기반 진행률 계산
  const calculateWeightedProgress = (taskId: string): { progress: number; totalWeight: number } => {
    const children = taskHierarchy.getChildren(taskId);
    if (children.length === 0) {
      const task = tasks.find(t => t.id === taskId);
      return { progress: task?.progress || 0, totalWeight: 100 };
    }

    const totalWeight = children.reduce((sum, child) => sum + (child.weight || 0), 0);
    const weightedProgress = children.reduce((sum, child) => {
      const childWeight = child.weight || 0;
      const childProgress = child.progress || 0;
      return sum + (childProgress * childWeight / 100);
    }, 0);

    return { progress: Math.round(weightedProgress), totalWeight };
  };

  const handleAddTask = (parentId?: string) => {
    if (newTaskName.trim()) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      onAddTask({
        name: newTaskName,
        startDate: today,
        endDate: tomorrow,
        progress: 0,
        status: 'todo',
        color: '#3b82f6',
        parentId,
        weight: parentId ? newTaskWeight : undefined,
      });
      setNewTaskName('');
      setNewTaskWeight(100);
      setIsAddingTask(false);
      setAddingSubtaskToId(null);

      // 부모 작업이 있으면 자동으로 펼치기
      if (parentId) {
        setExpandedTasks(prev => new Set([...prev, parentId]));
      }
    }
  };

  const toggleExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'todo':
        return 'bg-gray-200 text-gray-700';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'todo':
        return '할 일';
      case 'in-progress':
        return '진행 중';
      case 'completed':
        return '완료';
      default:
        return '할 일';
    }
  };

  const renderTask = (task: Task, level: number = 0) => {
    const children = taskHierarchy.getChildren(task.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const { progress: calculatedProgress, totalWeight } = calculateWeightedProgress(task.id);
    const isWeightValid = !hasChildren || totalWeight === 100;

    return (
        <div key={task.id}>
          <div
              className={`border-b transition-colors ${
                  selectedTaskId === task.id ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
          >
            <div
                className="p-4 cursor-pointer"
                style={{ paddingLeft: `${16 + level * 24}px` }}
                onClick={() => onSelectTask(task.id === selectedTaskId ? null : task.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(task.id);
                        }}
                        className="p-0.5 hover:bg-gray-200 rounded"
                    >
                      {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                      ) : (
                          <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <h3 className="font-medium truncate">{task.name}</h3>
                    {hasChildren && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {children.length}개 하위 작업
                    </span>
                    )}
                    {task.weight !== undefined && (
                        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded font-medium">
                      가중치 {task.weight}%
                    </span>
                    )}
                    {hasChildren && !isWeightValid && (
                        <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      가중치 합계 {totalWeight}%
                    </span>
                    )}
                  </div>

                  {isExpanded && (
                      <div className="ml-6 space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                        {format(task.startDate, 'MM/dd', { locale: ko })} -{' '}
                            {format(task.endDate, 'MM/dd', { locale: ko })}
                      </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">진행률:</span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 transition-all"
                                style={{ width: `${calculatedProgress}%` }}
                            />
                          </div>
                          <span className="text-gray-600 min-w-[3rem] text-right">
                        {calculatedProgress}%
                      </span>
                          {hasChildren && (
                              <span className="text-xs text-gray-400">(가중치 합계)</span>
                          )}
                        </div>
                        {!hasChildren && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">진행률 조정:</span>
                              <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={task.progress}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    onUpdateTask(task.id, {
                                      progress: parseInt(e.target.value),
                                    });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1"
                              />
                            </div>
                        )}
                        {task.weight !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">가중치:</span>
                              <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={task.weight}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    onUpdateTask(task.id, {
                                      weight: parseInt(e.target.value),
                                    });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1"
                              />
                              <span className="text-gray-600 min-w-[3rem] text-right">
                          {task.weight}%
                        </span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">상태:</span>
                          <select
                              value={task.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                onUpdateTask(task.id, {
                                  status: e.target.value as Task['status'],
                                });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                  task.status
                              )}`}
                          >
                            <option value="todo">할 일</option>
                            <option value="in-progress">진행 중</option>
                            <option value="completed">완료</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddingSubtaskToId(task.id);
                                // 기존 자식들의 가중치 합계 계산
                                const currentTotalWeight = children.reduce((sum, child) => sum + (child.weight || 0), 0);
                                const suggestedWeight = Math.max(0, 100 - currentTotalWeight);
                                setNewTaskWeight(suggestedWeight);
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            하위 작업 추가
                          </button>
                        </div>
                      </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                <span
                    className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
                        task.status
                    )}`}
                >
                  {getStatusLabel(task.status)}
                </span>
                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTask(task.id);
                      }}
                      className="p-1.5 hover:bg-red-100 rounded-lg transition-colors group"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 하위 작업 추가 폼 */}
          {addingSubtaskToId === task.id && (
              <div className="border-b bg-blue-50" style={{ paddingLeft: `${16 + (level + 1) * 24}px` }}>
                <div className="p-4 space-y-3">
                  <input
                      type="text"
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTask(task.id);
                        if (e.key === 'Escape') {
                          setAddingSubtaskToId(null);
                          setNewTaskName('');
                          setNewTaskWeight(100);
                        }
                      }}
                      placeholder="하위 작업 이름을 입력하세요..."
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 whitespace-nowrap">가중치:</span>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={newTaskWeight}
                        onChange={(e) => setNewTaskWeight(parseInt(e.target.value))}
                        className="flex-1"
                    />
                    <span className="text-sm text-gray-600 min-w-[3rem] text-right">
                  {newTaskWeight}%
                </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                        onClick={() => handleAddTask(task.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      추가
                    </button>
                    <button
                        onClick={() => {
                          setAddingSubtaskToId(null);
                          setNewTaskName('');
                          setNewTaskWeight(100);
                        }}
                        className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
          )}

          {/* 자식 작업들 렌더링 */}
          {isExpanded && children.map((child) => renderTask(child, level + 1))}
        </div>
    );
  };

  return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">작업 목록</h2>
            <button
                onClick={() => setIsAddingTask(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isAddingTask && (
              <div className="p-4 border-b bg-blue-50">
                <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTask();
                      if (e.key === 'Escape') {
                        setIsAddingTask(false);
                        setNewTaskName('');
                      }
                    }}
                    placeholder="새 작업 이름을 입력하세요..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                      onClick={() => handleAddTask()}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    추가
                  </button>
                  <button
                      onClick={() => {
                        setIsAddingTask(false);
                        setNewTaskName('');
                      }}
                      className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  >
                    취소
                  </button>
                </div>
              </div>
          )}

          {taskHierarchy.rootTasks.map((task) => renderTask(task, 0))}

          {tasks.length === 0 && !isAddingTask && (
              <div className="p-8 text-center text-gray-400">
                <p>작업이 없습니다.</p>
                <p className="text-sm mt-1">+ 버튼을 눌러 새 작업을 추가하세요.</p>
              </div>
          )}
        </div>
      </div>
  );
}
