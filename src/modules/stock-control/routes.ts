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