import { Router } from 'express';
import { ok } from '../../common/http/api-response';
import { asyncHandler } from '../../common/utils/async-handler';
import { getWarehouseSummary, listWarehouseLocations } from './store';

export const warehouseRouter = Router();

warehouseRouter.get(
  '/summary',
  asyncHandler(async (_request, response) => {
    return ok(response, getWarehouseSummary(), 200);
  })
);

warehouseRouter.get(
  '/locations',
  asyncHandler(async (request, response) => {
    const items = listWarehouseLocations({
      search: String(request.query.search ?? ''),
      status: String(request.query.status ?? 'all')
    });

    return ok(response, items, 200);
  })
);
