import { useState, useMemo } from 'react';
import { Plus, Trash2, Calendar, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Task } from '../types';

interface MobileTaskListProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onUpdateTask: (id: string, task: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
}

export function MobileTaskList({
                                 tasks,
                                 onAddTask,
                                 onUpdateTask,
                                 onDeleteTask,
                                 selectedTaskId,
                                 onSelectTask,
                               }: MobileTaskListProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [addingSubtaskToId, setAddingSubtaskToId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskWeight, setNewTaskWeight] = useState(100);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const taskHierarchy = useMemo(() => {
    const rootTasks = tasks.filter(task => !task.parentId);
    const getChildren = (parentId: string): Task[] => {
      return tasks.filter(task => task.parentId === parentId);
    };
    return { rootTasks, getChildren };
  }, [tasks]);

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
    }
  };

  const renderTask = (task: Task, level: number = 0) => {
    const children = taskHierarchy.getChildren(task.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const { progress: calculatedProgress, totalWeight } = calculateWeightedProgress(task.id);
    const isWeightValid = !hasChildren || totalWeight === 100;

    return (
        <div key={task.id} className="mb-2">
    <div
        className={`rounded-xl transition-all ${
        selectedTaskId === task.id ? 'bg-blue-50 ring-2 ring-blue-500' : 'bg-white'
    } shadow-sm`}
    style={{ marginLeft: `${level * 16}px` }}
  >
    <div
        className="p-4"
    onClick={() => onSelectTask(task.id === selectedTaskId ? null : task.id)}
  >
    <div className="flex items-start gap-3">
    <button
        onClick={(e) => {
      e.stopPropagation();
      toggleExpanded(task.id);
    }}
    className="mt-1 p-1 hover:bg-gray-100 rounded-lg flex-shrink-0"
        >
        {isExpanded ? (
              <ChevronDown className="w-5 h-5" />
          ) : (
              <ChevronRight className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
    <div className="flex items-start justify-between gap-2 mb-2">
    <h3 className="font-medium text-base">{task.name}</h3>
        <button
    onClick={(e) => {
      e.stopPropagation();
      if (confirm('이 작업을 삭제하시겠습니까?')) {
        onDeleteTask(task.id);
      }
    }}
    className="p-2 hover:bg-red-50 rounded-lg flex-shrink-0"
    >
    <Trash2 className="w-4 h-4 text-gray-400" />
        </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
    {getStatusLabel(task.status)}
    </span>
    {hasChildren && (
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {children.length}개
    </span>
    )}
    {task.weight !== undefined && (
        <span className="text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full font-medium">
            {task.weight}%
            </span>
    )}
    {hasChildren && !isWeightValid && (
        <span className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded-full flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
            {totalWeight}%
            </span>
    )}
    </div>

    <div className="space-y-3">
    <div className="flex items-center gap-2 text-sm text-gray-600">
    <Calendar className="w-4 h-4 flex-shrink-0" />
        <span>
            {format(task.startDate, 'M/d', { locale: ko })} - {format(task.endDate, 'M/d', { locale: ko })}
    </span>
    </div>

    <div>
    <div className="flex items-center justify-between text-sm mb-1">
    <span className="text-gray-600">진행률</span>
        <span className="font-medium">{calculatedProgress}%</span>
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
    <div
        className="h-full bg-blue-600 transition-all"
    style={{ width: `${calculatedProgress}%` }}
    />
    </div>
    </div>
    </div>

    {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-3">
            {!hasChildren && (
        <div>
            <label className="text-sm text-gray-600 mb-2 block">진행률 조정</label>
    <input
      type="range"
      min="0"
      max="100"
      value={task.progress}
      onChange={(e) => {
      e.stopPropagation();
      onUpdateTask(task.id, { progress: parseInt(e.target.value) });
    }}
      onClick={(e) => e.stopPropagation()}
      className="w-full"
          />
          </div>
    )}

      {task.weight !== undefined && (
          <div>
              <label className="text-sm text-gray-600 mb-2 block">가중치</label>
              <input
        type="range"
        min="0"
        max="100"
        value={task.weight}
        onChange={(e) => {
        e.stopPropagation();
        onUpdateTask(task.id, { weight: parseInt(e.target.value) });
      }}
        onClick={(e) => e.stopPropagation()}
        className="w-full"
            />
            </div>
      )}

      <div>
          <label className="text-sm text-gray-600 mb-2 block">상태</label>
          <select
      value={task.status}
      onChange={(e) => {
      e.stopPropagation();
      onUpdateTask(task.id, { status: e.target.value as Task['status'] });
    }}
      onClick={(e) => e.stopPropagation()}
      className="w-full px-4 py-2.5 border rounded-lg text-sm bg-white"
      >
      <option value="todo">할 일</option>
    <option value="in-progress">진행 중</option>
    <option value="completed">완료</option>
        </select>
        </div>

        <button
      onClick={(e) => {
      e.stopPropagation();
      setAddingSubtaskToId(task.id);
      const currentTotalWeight = children.reduce((sum, child) => sum + (child.weight || 0), 0);
      const suggestedWeight = Math.max(0, 100 - currentTotalWeight);
      setNewTaskWeight(suggestedWeight);
    }}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors font-medium"
      >
      <Plus className="w-5 h-5" />
          하위 작업 추가
    </button>
    </div>
    )}
    </div>
    </div>
    </div>
    </div>

    {addingSubtaskToId === task.id && (
        <div className="mb-2 p-4 bg-blue-50 rounded-xl" style={{ marginLeft: `${(level + 1) * 16}px` }}>
      <input
          type="text"
      value={newTaskName}
      onChange={(e) => setNewTaskName(e.target.value)}
      placeholder="하위 작업 이름"
      className="w-full px-4 py-3 border rounded-lg mb-3 text-base"
      autoFocus
      />
      <div className="mb-3">
      <label className="text-sm text-gray-600 mb-2 block">가중치: {newTaskWeight}%</label>
    <input
      type="range"
      min="0"
      max="100"
      value={newTaskWeight}
      onChange={(e) => setNewTaskWeight(parseInt(e.target.value))}
      className="w-full"
          />
          </div>
          <div className="flex gap-2">
    <button
        onClick={() => handleAddTask(task.id)}
      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium"
          >
          추가
          </button>
          <button
      onClick={() => {
      setAddingSubtaskToId(null);
      setNewTaskName('');
      setNewTaskWeight(100);
    }}
      className="flex-1 px-4 py-3 bg-gray-200 rounded-lg font-medium"
          >
          취소
          </button>
          </div>
          </div>
    )}

    {isExpanded && children.map((child) => renderTask(child, level + 1))}
    </div>
  );
  };

  return (
      <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4">
          {taskHierarchy.rootTasks.map((task) => renderTask(task, 0))}

  {tasks.length === 0 && (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 px-8">
      <p className="text-lg">작업이 없습니다</p>
  <p className="text-sm mt-2">아래 + 버튼을 눌러 새 작업을 추가하세요</p>
  </div>
  )}
  </div>

  <div className="p-4 bg-white border-t">
      {isAddingTask ? (
                <div className="space-y-3">
                <input
                    type="text"
            value={newTaskName}
        onChange={(e) => setNewTaskName(e.target.value)}
  placeholder="새 작업 이름"
  className="w-full px-4 py-3 border rounded-lg text-base"
  autoFocus
  />
  <div className="flex gap-2">
  <button
      onClick={() => handleAddTask()}
  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium"
      >
      추가
      </button>
      <button
  onClick={() => {
    setIsAddingTask(false);
    setNewTaskName('');
  }}
  className="flex-1 px-4 py-3 bg-gray-200 rounded-lg font-medium"
      >
      취소
      </button>
      </div>
      </div>
) : (
      <button
          onClick={() => setIsAddingTask(true)}
  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-blue-600 text-white rounded-lg font-medium shadow-lg"
  >
  <Plus className="w-6 h-6" />
      새 작업 추가
  </button>
)}
  </div>
  </div>
);
}
