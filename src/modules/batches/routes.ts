import { Router } from 'express';
import { created, ok } from '../../common/http/api-response';
import { asyncHandler } from '../../common/utils/async-handler';
import { AppError } from '../../common/errors/app-error';
import { getInventoryById } from '../inventory/repository';
import {
  createBatch,
  getBatchById,
  getBatchPersistenceMode,
  listBatchStatusHistory,
  listBatches,
  updateBatchStatus,
  type BatchStatus
} from './repository';

export const batchesRouter = Router();

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

const allowedStatuses: BatchStatus[] = [
  'available',
  'blocked',
  'quarantine',
  'expired',
  'consumed'
];

function optionalText(value: unknown, max = 120) {
  const text = String(value ?? '').trim();

  if (!text) {
    return '';
  }

  if (text.length > max) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `Text length must be ${max} characters or less`
    });
  }

  return text;
}

function requiredText(value: unknown, field: string, min = 1, max = 120) {
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

function optionalNumber(value: unknown, field: string, min = 0) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 0;
  }

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

function optionalDateText(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

batchesRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const items = await listBatches({
      inventoryItemId: readSingle(request.query.inventoryItemId as string | string[] | undefined),
      status: readSingle(request.query.status as string | string[] | undefined),
      search: readSingle(request.query.search as string | string[] | undefined)
    });

    return ok(
      response,
      {
        items,
        total: items.length,
        persistenceMode: getBatchPersistenceMode()
      },
      200
    );
  })
);

batchesRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);
    const item = await getBatchById(id);

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'BATCH_NOT_FOUND',
        message: 'Batch not found'
      });
    }

    return ok(response, item, 200);
  })
);

batchesRouter.get(
  '/:id/status-history',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);

    const batch = await getBatchById(id);

    if (!batch) {
      throw new AppError({
        status: 404,
        code: 'BATCH_NOT_FOUND',
        message: 'Batch not found'
      });
    }

    const items = listBatchStatusHistory(id);
    return ok(response, items, 200);
  })
);

batchesRouter.post(
  '/',
  asyncHandler(async (request, response) => {
    const inventoryItemId = requiredText(request.body?.inventoryItemId, 'inventoryItemId', 3, 100);
    const inventoryItem = await getInventoryById(inventoryItemId);

    if (!inventoryItem) {
      throw new AppError({
        status: 404,
        code: 'INVENTORY_NOT_FOUND',
        message: 'Referenced inventory item was not found'
      });
    }

    if (!inventoryItem.isBatchTracked) {
      throw new AppError({
        status: 400,
        code: 'ITEM_NOT_BATCH_TRACKED',
        message: 'Selected inventory item is not batch-tracked, so batch creation is not allowed'
      });
    }

    const batchStatus = String(request.body?.batchStatus ?? '').trim() as BatchStatus;

    if (!allowedStatuses.includes(batchStatus)) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'batchStatus must be one of: available, blocked, quarantine, expired, consumed'
      });
    }

    const expiryDate = optionalDateText(request.body?.expiryDate);

    if (inventoryItem.isExpiryTracked && !expiryDate) {
      throw new AppError({
        status: 400,
        code: 'EXPIRY_DATE_REQUIRED',
        message: 'Selected inventory item requires expiry tracking, so expiryDate is required'
      });
    }

    const item = await createBatch({
      inventoryItemId,
      batchNumber: requiredText(request.body?.batchNumber, 'batchNumber', 2, 80),
      lotNumber: optionalText(request.body?.lotNumber, 80),
      supplierLotNumber: optionalText(request.body?.supplierLotNumber, 80),
      manufactureDate: optionalDateText(request.body?.manufactureDate),
      expiryDate,
      receivedDate: optionalDateText(request.body?.receivedDate),
      supplierName: optionalText(request.body?.supplierName, 120),
      purchaseOrderNo: optionalText(request.body?.purchaseOrderNo, 80),
      goodsReceivedNoteNo: optionalText(request.body?.goodsReceivedNoteNo, 80),
      unitCost: optionalNumber(request.body?.unitCost, 'unitCost', 0),
      currency: optionalText(request.body?.currency, 10),
      receivedQty: optionalNumber(request.body?.receivedQty, 'receivedQty', 0),
      availableQty: optionalNumber(request.body?.availableQty, 'availableQty', 0),
      reservedQty: 0,
      blockedQty: 0,
      qaHoldQty: 0,
      batchStatus,
      warehouseLocation: optionalText(request.body?.warehouseLocation, 50),
      zone: optionalText(request.body?.zone, 20),
      aisle: optionalText(request.body?.aisle, 20),
      levelCode: optionalText(request.body?.levelCode, 20),
      bin: optionalText(request.body?.bin, 20),
      notes: optionalText(request.body?.notes, 250)
    });

    return created(response, item);
  })
);

batchesRouter.patch(
  '/:id/status',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);
    const nextStatus = String(request.body?.batchStatus ?? '').trim() as BatchStatus;
    const notes = optionalText(request.body?.notes, 250);

    if (!allowedStatuses.includes(nextStatus)) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'batchStatus must be one of: available, blocked, quarantine, expired, consumed'
      });
    }

    const item = await updateBatchStatus(
      id,
      nextStatus,
      notes || `Status changed to ${nextStatus}`
    );

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'BATCH_NOT_FOUND',
        message: 'Batch not found'
      });
    }

    return ok(response, item, 200);
  })
);