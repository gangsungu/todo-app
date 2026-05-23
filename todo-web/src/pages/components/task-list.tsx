import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import type { Task } from '../types';
import { calculateWeightedProgress } from '../utils/task-progress';
import { DESKTOP_TASK_DEFAULTS } from '../utils/task-defaults';
import { useTaskTree } from '../hooks/use-task-tree';

interface TaskListProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onUpdateTask: (id: string, task: Partial<Task>) => void;
  onUpdateWeights: (updates: { id: string; weight: number }[]) => void;
  onDeleteTask: (id: string) => void;
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
}

export function TaskList({
  tasks,
  onAddTask,
  onUpdateTask,
  onUpdateWeights,
  onDeleteTask,
  selectedTaskId,
  onSelectTask,
}: TaskListProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [addingSubtaskToId, setAddingSubtaskToId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskWeight, setNewTaskWeight] = useState(100);
  const [newTaskStartDate, setNewTaskStartDate] = useState('');
  const [newTaskEndDate, setNewTaskEndDate] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [weightDrafts, setWeightDrafts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    setWeightDrafts(new Map());
  }, [selectedTaskId]);

  const taskHierarchy = useTaskTree(tasks);

  const getDefaultDates = () => {
    const today = new Date();
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + DESKTOP_TASK_DEFAULTS.defaultDurationDays);
    return {
      start: format(today, 'yyyy-MM-dd'),
      end: format(defaultEnd, 'yyyy-MM-dd'),
    };
  };

  const handleAddTask = (parentId?: string) => {
    if (newTaskName.trim()) {
      const defaults = getDefaultDates();
      const startDate = new Date((newTaskStartDate || defaults.start) + 'T00:00:00');
      const endDate = new Date((newTaskEndDate || defaults.end) + 'T00:00:00');

      onAddTask({
        name: newTaskName,
        startDate,
        endDate,
        progress: 0,
        status: 'todo',
        color: DESKTOP_TASK_DEFAULTS.color,
        parentId,
        weight: parentId ? newTaskWeight : undefined,
      });
      setNewTaskName('');
      setNewTaskWeight(100);
      setNewTaskStartDate('');
      setNewTaskEndDate('');
      setIsAddingTask(false);
      setAddingSubtaskToId(null);

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
        return 'text-gray-500';
      case 'in-progress':
        return 'text-indigo-600';
      case 'completed':
        return 'text-gray-400 line-through';
      default:
        return 'text-gray-500';
    }
  };

  const renderTask = (task: Task, level: number = 0) => {
    const children = taskHierarchy.getChildren(task.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedTasks.has(task.id);

    return (
      <div key={task.id}>
        <div
          className={`group flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer transition-colors ${
            selectedTaskId === task.id ? 'bg-indigo-50' : ''
          }`}
          style={{ paddingLeft: `${12 + level * 20}px` }}
          onClick={() => onSelectTask(task.id === selectedTaskId ? null : task.id)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(task.id);
            }}
            className="p-0 hover:bg-gray-200 rounded flex-shrink-0"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </button>

          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className={`text-sm truncate ${getStatusColor(task.status)}`}>
              {task.name}
            </span>
            {hasChildren && (
              <span className="text-xs text-gray-400 flex-shrink-0">
                {children.length}
              </span>
            )}
            {task.weight !== undefined && (
              <span className="text-xs text-gray-400 flex-shrink-0">
                {task.weight}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAddingSubtaskToId(task.id);
                const currentTotalWeight = children.reduce((sum, child) => sum + (child.weight || 0), 0);
                const suggestedWeight = Math.max(0, 100 - currentTotalWeight);
                setNewTaskWeight(suggestedWeight);
                const defaults = getDefaultDates();
                setNewTaskStartDate(defaults.start);
                setNewTaskEndDate(defaults.end);
              }}
              className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTask(task.id);
              }}
              className="p-1 hover:bg-red-100 rounded flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-600" />
            </button>
          </div>
        </div>

        {addingSubtaskToId === task.id && (
          <div className="mx-3 my-1 p-2 bg-gray-50 rounded border border-gray-200" style={{ marginLeft: `${12 + (level + 1) * 20}px` }}>
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
                  setNewTaskStartDate('');
                  setNewTaskEndDate('');
                }
              }}
              placeholder="Task name"
              className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:outline-none"
              autoFocus
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="date"
                value={newTaskStartDate}
                onChange={(e) => setNewTaskStartDate(e.target.value)}
                className="px-1 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-gray-400">-</span>
              <input
                type="date"
                value={newTaskEndDate}
                onChange={(e) => setNewTaskEndDate(e.target.value)}
                className="px-1 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min="0"
                max="100"
                value={newTaskWeight}
                onChange={(e) => setNewTaskWeight(parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-gray-500">% weight</span>
              <div className="flex-1" />
              <button
                onClick={() => handleAddTask(task.id)}
                className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setAddingSubtaskToId(null);
                  setNewTaskName('');
                  setNewTaskWeight(100);
                  setNewTaskStartDate('');
                  setNewTaskEndDate('');
                }}
                className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isExpanded && children.map((child) => renderTask(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-medium text-gray-900">Tasks</h2>
        <button
          onClick={() => {
            const defaults = getDefaultDates();
            setNewTaskStartDate(defaults.start);
            setNewTaskEndDate(defaults.end);
            setIsAddingTask(true);
          }}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <Plus className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isAddingTask && (
          <div className="m-3 p-2 bg-gray-50 rounded border border-gray-200">
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask();
                if (e.key === 'Escape') {
                  setIsAddingTask(false);
                  setNewTaskName('');
                  setNewTaskStartDate('');
                  setNewTaskEndDate('');
                }
              }}
              placeholder="Task name"
              className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:outline-none"
              autoFocus
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="date"
                value={newTaskStartDate}
                onChange={(e) => setNewTaskStartDate(e.target.value)}
                className="px-1 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-gray-400">-</span>
              <input
                type="date"
                value={newTaskEndDate}
                onChange={(e) => setNewTaskEndDate(e.target.value)}
                className="px-1 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => handleAddTask()}
                className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTaskName('');
                  setNewTaskStartDate('');
                  setNewTaskEndDate('');
                }}
                className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="py-1">
          {taskHierarchy.rootTasks.map((task) => renderTask(task, 0))}
        </div>

        {tasks.length === 0 && !isAddingTask && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <p className="text-sm text-gray-400">No tasks yet</p>
            <p className="text-xs text-gray-400 mt-1">Click + to create one</p>
          </div>
        )}
      </div>

      {/* Task Details Panel */}
      {selectedTaskId && tasks.find(t => t.id === selectedTaskId) && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {(() => {
            const task = tasks.find(t => t.id === selectedTaskId)!;
            const children = taskHierarchy.getChildren(task.id);
            const hasChildren = children.length > 0;
            const { progress: calculatedProgress } = calculateWeightedProgress(task.id, tasks, taskHierarchy.getChildren);

            return (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Progress</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 transition-all"
                        style={{ width: `${calculatedProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 font-medium">{calculatedProgress}%</span>
                  </div>
                  {!hasChildren && (
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={task.progress}
                      onChange={(e) => onUpdateTask(task.id, { progress: parseInt(e.target.value) })}
                      className="w-full mt-2"
                    />
                  )}
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <select
                    value={task.status}
                    onChange={(e) => onUpdateTask(task.id, { status: e.target.value as Task['status'] })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="todo">To do</option>
                    <option value="in-progress">In progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Date range</div>
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={format(task.startDate, 'yyyy-MM-dd')}
                      onChange={(e) => onUpdateTask(task.id, { startDate: new Date(e.target.value + 'T00:00:00') })}
                      className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-gray-400">-</span>
                    <input
                      type="date"
                      value={format(task.endDate, 'yyyy-MM-dd')}
                      onChange={(e) => onUpdateTask(task.id, { endDate: new Date(e.target.value + 'T00:00:00') })}
                      className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {(() => {
                  const weightSiblings = tasks.filter(t =>
                    t.parentId === task.parentId && t.weight !== undefined
                  );
                  if (weightSiblings.length === 0) return null;

                  const effective = weightSiblings.map(t => ({
                    id: t.id,
                    name: t.name,
                    weight: weightDrafts.has(t.id) ? weightDrafts.get(t.id)! : t.weight!,
                  }));
                  const total = effective.reduce((s, t) => s + t.weight, 0);
                  const hasDraft = weightDrafts.size > 0;

                  return (
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>Weight</span>
                        <span className={total === 100 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                          {total}%
                        </span>
                      </div>
                      {effective.map(sibling => (
                        <div key={sibling.id} className="flex items-center gap-2 mb-1.5">
                          <span className={`text-xs truncate w-16 ${sibling.id === task.id ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
                            {sibling.name}
                          </span>
                          <input
                            type="range" min="0" max="100"
                            value={sibling.weight}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setWeightDrafts(prev => new Map([...prev, [sibling.id, val]]));
                            }}
                            className="flex-1"
                          />
                          <span className="text-xs text-gray-600 w-8 text-right">{sibling.weight}%</span>
                        </div>
                      ))}
                      {hasDraft && (
                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={() => {
                              onUpdateWeights(effective.map(t => ({ id: t.id, weight: t.weight })));
                              setWeightDrafts(new Map());
                            }}
                            disabled={total !== 100}
                            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                              total === 100
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setWeightDrafts(new Map())}
                            className="flex-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 rounded"
                          >
                            취소
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
