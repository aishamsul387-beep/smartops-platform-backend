import { Router } from 'express';
import { created, ok } from '../../common/http/api-response';
import { asyncHandler } from '../../common/utils/async-handler';
import { AppError } from '../../common/errors/app-error';
import {
  validateCreateInventoryRequest,
  validateInventoryIdParam,
  validateInventoryListQuery,
  validateInventoryPaginationQuery
} from '../../features/inventory/validators/inventory.validator';
import { createInventory, getInventoryById, listInventory } from './store';

export const inventoryRouter = Router();

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

inventoryRouter.get(
  '/',
  validateInventoryListQuery,
  validateInventoryPaginationQuery,
  asyncHandler(async (request, response) => {
    const items = listInventory({
      search: readSingle(request.query.search as string | string[] | undefined),
      status: readSingle(request.query.status as string | string[] | undefined) || 'all'
    });

    return ok(response, items, 200);
  })
);

inventoryRouter.get(
  '/:id',
  validateInventoryIdParam,
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);
    const item = getInventoryById(id);

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'INVENTORY_NOT_FOUND',
        message: 'Inventory item not found'
      });
    }

    return ok(response, item, 200);
  })
);

inventoryRouter.post(
  '/',
  validateCreateInventoryRequest,
  asyncHandler(async (request, response) => {
    const item = createInventory(request.body);
    return created(response, item);
  })
);
