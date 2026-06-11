import { Router } from 'express';
import { created, ok } from '../../common/http/api-response';
import { asyncHandler } from '../../common/utils/async-handler';
import { AppError } from '../../common/errors/app-error';
import {
  createWarehouseLocation,
  exportWarehouseLocationsCsv,
  getWarehouseLocationById,
  importWarehouseLocationsCsv,
  listWarehouseLocations,
  toggleWarehouseLocationActive,
  updateWarehouseLocation,
  type WarehouseLocationStatus,
  type WarehouseLocationType
} from './store';

export const warehouseRouter = Router();

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

const allowedStatuses: WarehouseLocationStatus[] = ['empty', 'occupied', 'blocked'];
const allowedTypes: WarehouseLocationType[] = ['rack', 'floor', 'bulk', 'staging', 'quarantine'];

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

function optionalText(value: unknown, max = 250) {
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

function requiredNumber(value: unknown, field: string, min = 0) {
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
  const status = String(value ?? '').trim() as WarehouseLocationStatus;

  if (!allowedStatuses.includes(status)) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'status must be one of: empty, occupied, blocked'
    });
  }

  return status;
}

function normalizeType(value: unknown) {
  const type = String(value ?? '').trim() as WarehouseLocationType;

  if (!allowedTypes.includes(type)) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'locationType must be one of: rack, floor, bulk, staging, quarantine'
    });
  }

  return type;
}

warehouseRouter.get(
  '/locations',
  asyncHandler(async (request, response) => {
    const items = listWarehouseLocations({
      search: readSingle(request.query.search as string | string[] | undefined),
      status: readSingle(request.query.status as string | string[] | undefined),
      type: readSingle(request.query.type as string | string[] | undefined),
      active: readSingle(request.query.active as string | string[] | undefined)
    });

    return ok(
      response,
      {
        items,
        total: items.length
      },
      200
    );
  })
);

warehouseRouter.get(
  '/locations/export-csv',
  asyncHandler(async (_request, response) => {
    const csvText = exportWarehouseLocationsCsv();
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="warehouse-locations.csv"');
    response.status(200).send(csvText);
  })
);

warehouseRouter.post(
  '/locations/import-csv',
  asyncHandler(async (request, response) => {
    const csvText = String(request.body?.csvText ?? '');

    if (!csvText.trim()) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'csvText is required'
      });
    }

    const result = importWarehouseLocationsCsv(csvText);
    return ok(response, result, 200);
  })
);

warehouseRouter.get(
  '/locations/:id',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);
    const item = getWarehouseLocationById(id);

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'WAREHOUSE_LOCATION_NOT_FOUND',
        message: 'Warehouse location not found'
      });
    }

    return ok(response, item, 200);
  })
);

warehouseRouter.post(
  '/locations',
  asyncHandler(async (request, response) => {
    const item = createWarehouseLocation({
      warehouseCode: requiredText(request.body?.warehouseCode, 'warehouseCode', 2, 30),
      warehouseName: requiredText(request.body?.warehouseName, 'warehouseName', 2, 120),
      locationCode: requiredText(request.body?.locationCode, 'locationCode', 3, 50),
      zone: requiredText(request.body?.zone, 'zone', 1, 20),
      aisle: requiredText(request.body?.aisle, 'aisle', 1, 20),
      levelCode: requiredText(request.body?.levelCode, 'levelCode', 1, 20),
      bin: requiredText(request.body?.bin, 'bin', 1, 20),
      locationType: normalizeType(request.body?.locationType),
      status: normalizeStatus(request.body?.status),
      palletCapacity: requiredNumber(request.body?.palletCapacity, 'palletCapacity', 0),
      usedPalletCapacity: requiredNumber(request.body?.usedPalletCapacity, 'usedPalletCapacity', 0),
      cubicCapacityM3: requiredNumber(request.body?.cubicCapacityM3, 'cubicCapacityM3', 0),
      usedCubicCapacityM3: requiredNumber(request.body?.usedCubicCapacityM3, 'usedCubicCapacityM3', 0),
      isActive: request.body?.isActive === undefined ? true : Boolean(request.body?.isActive),
      notes: optionalText(request.body?.notes, 250)
    });

    return created(response, item);
  })
);

warehouseRouter.put(
  '/locations/:id',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);
    const existing = getWarehouseLocationById(id);

    if (!existing) {
      throw new AppError({
        status: 404,
        code: 'WAREHOUSE_LOCATION_NOT_FOUND',
        message: 'Warehouse location not found'
      });
    }

    const item = updateWarehouseLocation({
      id,
      warehouseCode: requiredText(request.body?.warehouseCode, 'warehouseCode', 2, 30),
      warehouseName: requiredText(request.body?.warehouseName, 'warehouseName', 2, 120),
      locationCode: requiredText(request.body?.locationCode, 'locationCode', 3, 50),
      zone: requiredText(request.body?.zone, 'zone', 1, 20),
      aisle: requiredText(request.body?.aisle, 'aisle', 1, 20),
      levelCode: requiredText(request.body?.levelCode, 'levelCode', 1, 20),
      bin: requiredText(request.body?.bin, 'bin', 1, 20),
      locationType: normalizeType(request.body?.locationType),
      status: normalizeStatus(request.body?.status),
      palletCapacity: requiredNumber(request.body?.palletCapacity, 'palletCapacity', 0),
      usedPalletCapacity: requiredNumber(request.body?.usedPalletCapacity, 'usedPalletCapacity', 0),
      cubicCapacityM3: requiredNumber(request.body?.cubicCapacityM3, 'cubicCapacityM3', 0),
      usedCubicCapacityM3: requiredNumber(request.body?.usedCubicCapacityM3, 'usedCubicCapacityM3', 0),
      isActive: request.body?.isActive === undefined ? true : Boolean(request.body?.isActive),
      notes: optionalText(request.body?.notes, 250)
    });

    return ok(response, item, 200);
  })
);

warehouseRouter.patch(
  '/locations/:id/active',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);
    const item = toggleWarehouseLocationActive(id, Boolean(request.body?.isActive));

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'WAREHOUSE_LOCATION_NOT_FOUND',
        message: 'Warehouse location not found'
      });
    }

    return ok(response, item, 200);
  })
);