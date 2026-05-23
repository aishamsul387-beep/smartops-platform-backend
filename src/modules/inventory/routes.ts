import { Router } from 'express';
import { created, ok } from '../../common/http/api-response';
import { asyncHandler } from '../../common/utils/async-handler';
import { AppError } from '../../common/errors/app-error';
import {
  createInventory,
  getInventoryById,
  getInventoryPersistenceMode,
  listInventory,
  setInventoryActiveStatus,
  updateInventory,
  type InventoryStatus
} from './repository';

export const inventoryRouter = Router();

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

const allowedStatuses: InventoryStatus[] = ['in_stock', 'low_stock', 'out_of_stock'];

function requireText(value: unknown, field: string, min = 1, max = 150) {
  const text = String(value ?? '').trim();

  if (!text) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${field} is required`
    });
  }

  if (text.length < min || text.length > max) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${field} must be between ${min} and ${max} characters`
    });
  }

  return text;
}

function requireNumber(value: unknown, field: string, min = 0) {
  const parsed = Number(value);

  if (Number.isNaN(parsed) || parsed < min) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${field} must be a valid number ${min} or greater`
    });
  }

  return parsed;
}

function normalizeStatus(value: unknown) {
  const status = String(value ?? '').trim() as InventoryStatus;

  if (!allowedStatuses.includes(status)) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'status must be one of: in_stock, low_stock, out_of_stock'
    });
  }

  return status;
}

function buildInventoryInput(body: any) {
  return {
    sku: requireText(body?.sku, 'sku', 2, 50),
    barcode: String(body?.barcode ?? '').trim(),
    name: requireText(body?.name, 'name', 2, 120),
    description: String(body?.description ?? '').trim(),
    category: requireText(body?.category, 'category', 2, 80),
    quantity: requireNumber(body?.quantity, 'quantity', 0),
    reorderLevel: requireNumber(body?.reorderLevel, 'reorderLevel', 0),
    minimumStockLevel: requireNumber(body?.minimumStockLevel, 'minimumStockLevel', 0),
    maximumStockLevel: requireNumber(body?.maximumStockLevel, 'maximumStockLevel', 0),
    unit: requireText(body?.unit, 'unit', 1, 20),
    warehouseLocation: requireText(body?.warehouseLocation, 'warehouseLocation', 3, 30),
    status: normalizeStatus(body?.status ?? 'in_stock'),
    isActive: Boolean(body?.isActive),
    isBatchTracked: Boolean(body?.isBatchTracked),
    isExpiryTracked: Boolean(body?.isExpiryTracked),
    isSerialTracked: Boolean(body?.isSerialTracked),
    baseUomCode: requireText(body?.baseUomCode, 'baseUomCode', 1, 20).toUpperCase(),
    purchaseUomCode: requireText(body?.purchaseUomCode, 'purchaseUomCode', 1, 20).toUpperCase(),
    salesUomCode: requireText(body?.salesUomCode, 'salesUomCode', 1, 20).toUpperCase(),
    issueUomCode: requireText(body?.issueUomCode, 'issueUomCode', 1, 20).toUpperCase(),
    uomConversionGroupCode: String(body?.uomConversionGroupCode ?? '').trim().toUpperCase(),
    allowsFraction: Boolean(body?.allowsFraction),
    notes: String(body?.notes ?? '').trim()
  };
}

inventoryRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const items = await listInventory({
      search: readSingle(request.query.search as string | string[] | undefined),
      status: readSingle(request.query.status as string | string[] | undefined) || 'all'
    });

    return ok(
      response,
      {
        items,
        total: items.length,
        persistenceMode: getInventoryPersistenceMode()
      },
      200
    );
  })
);

inventoryRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);
    const item = await getInventoryById(id);

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
  asyncHandler(async (request, response) => {
    const item = await createInventory(buildInventoryInput(request.body));
    return created(response, item);
  })
);

inventoryRouter.put(
  '/:id',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);

    const existing = await getInventoryById(id);
    if (!existing) {
      throw new AppError({
        status: 404,
        code: 'INVENTORY_NOT_FOUND',
        message: 'Inventory item not found'
      });
    }

    const item = await updateInventory({
      id,
      ...buildInventoryInput(request.body)
    });

    return ok(response, item, 200);
  })
);

inventoryRouter.patch(
  '/:id/active',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);
    const isActive = Boolean(request.body?.isActive);

    const item = await setInventoryActiveStatus(id, isActive);

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