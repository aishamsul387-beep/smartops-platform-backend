import { Router } from 'express';
import { ok } from '../../common/http/api-response';
import { asyncHandler } from '../../common/utils/async-handler';
import {
  getProcurementActionQueue,
  getReorderSuggestions,
  getStockControlAlerts,
  getStockControlSummary
} from './service';

export const stockControlRouter = Router();

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

stockControlRouter.get(
  '/procurement-actions',
  asyncHandler(async (_request, response) => {
    const actions = await getProcurementActionQueue();
    return ok(response, actions, 200);
  })
);