import { Router } from 'express';
import { ok } from '../../common/http/api-response';
import { asyncHandler } from '../../common/utils/async-handler';
import { AppError } from '../../common/errors/app-error';
import {
  getAllowedNextStatuses,
  getTaskById,
  listTasks,
  updateTaskStatus,
  type TaskStatus
} from './store';

export const tasksRouter = Router();

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

const allowedStatuses: TaskStatus[] = ['pending', 'in_progress', 'blocked', 'completed'];

tasksRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const items = listTasks({
      search: readSingle(request.query.search as string | string[] | undefined),
      status: readSingle(request.query.status as string | string[] | undefined),
      priority: readSingle(request.query.priority as string | string[] | undefined)
    });

    return ok(response, items, 200);
  })
);

tasksRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);
    const item = getTaskById(id);

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'TASK_NOT_FOUND',
        message: 'Task not found'
      });
    }

    return ok(
      response,
      {
        ...item,
        availableNextStatuses: getAllowedNextStatuses(item.status)
      },
      200
    );
  })
);

tasksRouter.patch(
  '/:id/status',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);
    const nextStatus = String(request.body?.status ?? '').trim();

    if (!allowedStatuses.includes(nextStatus as TaskStatus)) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'status must be one of: pending, in_progress, blocked, completed'
      });
    }

    const result = updateTaskStatus({
      id,
      status: nextStatus as TaskStatus
    });

    if (!result) {
      throw new AppError({
        status: 404,
        code: 'TASK_NOT_FOUND',
        message: 'Task not found'
      });
    }

    if ('error' in result && typeof result.error === 'string') {
      throw new AppError({
        status: 400,
        code: 'INVALID_TASK_STATUS_TRANSITION',
        message: result.error
      });
    }

    return ok(
      response,
      {
        ...result.item,
        availableNextStatuses: getAllowedNextStatuses(result.item.status)
      },
      200
    );
  })
);