import { Router } from 'express';
import { created, ok } from '../../common/http/api-response';
import { asyncHandler } from '../../common/utils/async-handler';
import { AppError } from '../../common/errors/app-error';
import {
  createDraftPurchaseOrderFromSuggestion,
  getProcurementActionQueue,
  getReorderSuggestions,
  getStockControlAlerts,
  getStockControlSummary
} from './service';
import {
  getBatchStockMovements,
  getInventoryStockMovements,
  getStockMovements
} from './movement-service';
import { commitIssueAllocation, previewIssueAllocation } from '../batches/repository';

export const stockControlRouter = Router();

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

stockControlRouter.get(
  '/summary',
  asyncHandler(async (_request, response) => {
    const summary = await getStockControlSummary();
    return ok(response, summary, 200);
  })
);

stockControlRouter.get(
  '/alerts',
  asyncHandler(async (_request, response) => {
    const alerts = await getStockControlAlerts();
    return ok(response, alerts, 200);
  })
);

stockControlRouter.get(
  '/reorder-suggestions',
  asyncHandler(async (_request, response) => {
    const suggestions = await getReorderSuggestions();
    return ok(response, suggestions, 200);
  })
);

stockControlRouter.post(
  '/reorder-suggestions/:inventoryItemId/create-po-draft',
  asyncHandler(async (request, response) => {
    const inventoryItemId = readSingle(
      request.params.inventoryItemId as string | string[] | undefined
    );

    const result = await createDraftPurchaseOrderFromSuggestion(inventoryItemId);

    if (!result) {
      throw new AppError({
        status: 404,
        code: 'REORDER_SUGGESTION_NOT_FOUND',
        message: 'Reorder suggestion not found for the given inventory item'
      });
    }

    return created(response, result);
  })
);

stockControlRouter.get(
  '/procurement-actions',
  asyncHandler(async (_request, response) => {
    const actions = await getProcurementActionQueue();
    return ok(response, actions, 200);
  })
);

stockControlRouter.get(
  '/movements',
  asyncHandler(async (_request, response) => {
    const items = await getStockMovements();
    return ok(response, items, 200);
  })
);

stockControlRouter.get(
  '/movements/inventory/:inventoryItemId',
  asyncHandler(async (request, response) => {
    const inventoryItemId = readSingle(
      request.params.inventoryItemId as string | string[] | undefined
    );

    const items = await getInventoryStockMovements(inventoryItemId);
    return ok(response, items, 200);
  })
);

stockControlRouter.get(
  '/movements/batch/:batchId',
  asyncHandler(async (request, response) => {
    const batchId = readSingle(request.params.batchId as string | string[] | undefined);
    const items = await getBatchStockMovements(batchId);
    return ok(response, items, 200);
  })
);

stockControlRouter.get(
  '/issue-preview',
  asyncHandler(async (request, response) => {
    const inventoryItemId = readSingle(request.query.inventoryItemId as string | string[] | undefined);
    const requestedQty = Number(readSingle(request.query.requestedQty as string | string[] | undefined));

    if (!inventoryItemId) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'inventoryItemId is required'
      });
    }

    if (Number.isNaN(requestedQty) || requestedQty <= 0) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'requestedQty must be greater than 0'
      });
    }

    const result = await previewIssueAllocation(inventoryItemId, requestedQty);
    return ok(response, result, 200);
  })
);

stockControlRouter.post(
  '/issues',
  asyncHandler(async (request, response) => {
    const inventoryItemId = String(request.body?.inventoryItemId ?? '').trim();
    const requestedQty = Number(request.body?.requestedQty);
    const reason = String(request.body?.reason ?? '').trim();

    if (!inventoryItemId) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'inventoryItemId is required'
      });
    }

    if (Number.isNaN(requestedQty) || requestedQty <= 0) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'requestedQty must be greater than 0'
      });
    }

    const result = await commitIssueAllocation({
      inventoryItemId,
      requestedQty,
      reason
    });

    if (!result) {
      throw new AppError({
        status: 400,
        code: 'NO_AVAILABLE_BATCH_STOCK',
        message: 'No available batch stock found for issue allocation'
      });
    }

    return created(response, result);
  })
);