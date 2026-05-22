import { Router } from 'express';
import { created, ok } from '../../common/http/api-response';
import { asyncHandler } from '../../common/utils/async-handler';
import { AppError } from '../../common/errors/app-error';
import {
  createInventory,
  getInventoryById,
  getInventoryPersistenceMode,
  listInventory
} from './repository';

export const inventoryRouter = Router();

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

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
    const item = await createInventory({
      sku: requireText(request.body?.sku, 'sku', 2, 50),
      barcode: String(request.body?.barcode ?? '').trim(),
      name: requireText(request.body?.name, 'name', 2, 120),
      description: String(request.body?.description ?? '').trim(),
      category: requireText(request.body?.category, 'category', 2, 80),
      quantity: requireNumber(request.body?.quantity, 'quantity', 0),
      reorderLevel: requireNumber(request.body?.reorderLevel, 'reorderLevel', 0),
      minimumStockLevel: requireNumber(request.body?.minimumStockLevel, 'minimumStockLevel', 0),
      maximumStockLevel: requireNumber(request.body?.maximumStockLevel, 'maximumStockLevel', 0),
      unit: requireText(request.body?.unit, 'unit', 1, 20),
      warehouseLocation: requireText(request.body?.warehouseLocation, 'warehouseLocation', 3, 30),
      status: String(request.body?.status ?? 'in_stock').trim() as any,
      isActive: Boolean(request.body?.isActive),
      isBatchTracked: Boolean(request.body?.isBatchTracked),
      isExpiryTracked: Boolean(request.body?.isExpiryTracked),
      isSerialTracked: Boolean(request.body?.isSerialTracked),
      baseUomCode: requireText(request.body?.baseUomCode, 'baseUomCode', 1, 20).toUpperCase(),
      purchaseUomCode: requireText(request.body?.purchaseUomCode, 'purchaseUomCode', 1, 20).toUpperCase(),
      salesUomCode: requireText(request.body?.salesUomCode, 'salesUomCode', 1, 20).toUpperCase(),
      issueUomCode: requireText(request.body?.issueUomCode, 'issueUomCode', 1, 20).toUpperCase(),
      uomConversionGroupCode: String(request.body?.uomConversionGroupCode ?? '').trim().toUpperCase(),
      allowsFraction: Boolean(request.body?.allowsFraction),
      notes: String(request.body?.notes ?? '').trim()
    });

    return created(response, item);
  })
);