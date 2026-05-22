export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskRecord {
  id: string;
  title: string;
  type: string;
  description: string;
  assignee: string;
  locationCode: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string;
  updatedAt: string;
}

export interface UpdateTaskStatusInput {
  id: string;
  status: TaskStatus;
}

let taskStore: TaskRecord[] = [
  {
    id: 'task-001',
    title: 'Put away steel sheet batch',
    type: 'Putaway',
    description: 'Move inbound steel sheet batch from staging area to the assigned rack location and confirm space allocation.',
    assignee: 'Operator User',
    locationCode: 'A-01-01',
    status: 'pending',
    priority: 'high',
    dueAt: '2026-05-21T14:00:00.000Z',
    updatedAt: '2026-05-21T10:20:00.000Z'
  },
  {
    id: 'task-002',
    title: 'Cycle count packaging bin',
    type: 'Cycle Count',
    description: 'Perform count verification on packaging bin B-02-04 and compare physical quantity against expected quantity.',
    assignee: 'Manager User',
    locationCode: 'B-02-04',
    status: 'in_progress',
    priority: 'medium',
    dueAt: '2026-05-21T16:00:00.000Z',
    updatedAt: '2026-05-21T10:45:00.000Z'
  },
  {
    id: 'task-003',
    title: 'Investigate blocked valve replenishment',
    type: 'Replenishment',
    description: 'Task is blocked until receiving discrepancy is reviewed and released by supervisor.',
    assignee: 'Admin User',
    locationCode: 'C-03-02',
    status: 'blocked',
    priority: 'high',
    dueAt: '2026-05-21T18:30:00.000Z',
    updatedAt: '2026-05-21T11:10:00.000Z'
  },
  {
    id: 'task-004',
    title: 'Complete goods staging verification',
    type: 'Staging',
    description: 'Final staging verification for outbound lane before dispatch confirmation.',
    assignee: 'Viewer User',
    locationCode: 'D-01-05',
    status: 'completed',
    priority: 'low',
    dueAt: '2026-05-21T12:00:00.000Z',
    updatedAt: '2026-05-21T09:50:00.000Z'
  }
];

const nextStatusMap: Record<TaskStatus, TaskStatus[]> = {
  pending: ['in_progress', 'blocked', 'completed'],
  in_progress: ['blocked', 'completed'],
  blocked: ['in_progress', 'completed'],
  completed: []
};

function matchesSearch(values: string[], search?: string) {
  const normalized = String(search ?? '').trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(normalized));
}

export function listTasks(filters?: { search?: string; status?: string; priority?: string }) {
  return taskStore.filter((item) => {
    const okSearch = matchesSearch(
      [item.title, item.type, item.assignee, item.locationCode],
      filters?.search
    );

    const status = String(filters?.status ?? '').trim();
    const priority = String(filters?.priority ?? '').trim();

    const okStatus = !status || status === 'all' || item.status === status;
    const okPriority = !priority || priority === 'all' || item.priority === priority;

    return okSearch && okStatus && okPriority;
  });
}

export function getTaskById(id: string) {
  return taskStore.find((item) => item.id === id) ?? null;
}

export function getAllowedNextStatuses(status: TaskStatus) {
  return nextStatusMap[status] ?? [];
}

export function updateTaskStatus(input: UpdateTaskStatusInput) {
  const current = taskStore.find((item) => item.id === input.id);

  if (!current) {
    return null;
  }

  const allowed = getAllowedNextStatuses(current.status);

  if (!allowed.includes(input.status)) {
    return {
      error: `Invalid transition from ${current.status} to ${input.status}`
    };
  }

  const updated: TaskRecord = {
    ...current,
    status: input.status,
    updatedAt: new Date().toISOString()
  };

  taskStore = taskStore.map((item) => (item.id === input.id ? updated : item));

  return {
    item: updated
  };
}