import type { NextFunction, Request, Response } from 'express';
import { requireEnumValue, requireNonNegativeNumber, requirePositiveInteger, requireTrimmedString, optionalTrimmedString } from '../../../common/validators/rules';

const INVENTORY_STATUSES = ['in_stock', 'low_stock', 'out_of_stock'] as const;

export function validateInventoryListQuery(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  try {
    const search = optionalTrimmedString(request.query.search, 'search', {
      maxLength: 100
    });

    const statusRaw = String(request.query.status ?? '').trim();
    const status =
      !statusRaw || statusRaw === 'all'
        ? 'all'
        : requireEnumValue(statusRaw, 'status', INVENTORY_STATUSES);

    request.query.search = search;
    request.query.status = status;

    next();
  } catch (error) {
    next(error);
  }
}

export function validateCreateInventoryRequest(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  try {
    request.body = {
      sku: requireTrimmedString(request.body?.sku, 'sku', { minLength: 2, maxLength: 50 }),
      name: requireTrimmedString(request.body?.name, 'name', { minLength: 2, maxLength: 120 }),
      category: requireTrimmedString(request.body?.category, 'category', { minLength: 2, maxLength: 80 }),
      quantity: requireNonNegativeNumber(request.body?.quantity, 'quantity'),
      reorderLevel: requireNonNegativeNumber(request.body?.reorderLevel, 'reorderLevel'),
      unit: requireTrimmedString(request.body?.unit, 'unit', { minLength: 1, maxLength: 20 }),
      warehouseLocation: requireTrimmedString(request.body?.warehouseLocation, 'warehouseLocation', {
        minLength: 3,
        maxLength: 30
      }),
      status: requireEnumValue(request.body?.status, 'status', INVENTORY_STATUSES)
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function validateInventoryIdParam(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  try {
    request.params.id = requireTrimmedString(request.params.id, 'inventory id', {
      minLength: 3,
      maxLength: 100
    });

    next();
  } catch (error) {
    next(error);
  }
}

export function validateInventoryPaginationQuery(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  try {
    if (request.query.page !== undefined) {
      request.query.page = String(requirePositiveInteger(request.query.page, 'page'));
    }

    if (request.query.pageSize !== undefined) {
      request.query.pageSize = String(requirePositiveInteger(request.query.pageSize, 'pageSize'));
    }

    next();
  } catch (error) {
    next(error);
  }
}