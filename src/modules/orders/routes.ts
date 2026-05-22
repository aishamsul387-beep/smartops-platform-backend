import { Router } from 'express';
import { created, ok } from '../../common/http/api-response';
import { asyncHandler } from '../../common/utils/async-handler';
import { AppError } from '../../common/errors/app-error';
import {
  createGRN,
  createPurchaseOrder,
  getGRNById,
  getOrdersSummary,
  getPurchaseOrderById,
  listGRNs,
  listPurchaseOrders,
  listQuotations,
  type GRNStatus,
  type PurchaseOrderStatus
} from './store';

export const ordersRouter = Router();

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

const purchaseOrderStatuses: PurchaseOrderStatus[] = [
  'draft',
  'issued',
  'partially_received',
  'received'
];

const grnStatuses: GRNStatus[] = ['draft', 'posted'];

ordersRouter.get(
  '/summary',
  asyncHandler(async (_request, response) => {
    return ok(response, getOrdersSummary(), 200);
  })
);

ordersRouter.get(
  '/quotations',
  asyncHandler(async (request, response) => {
    const items = listQuotations({
      search: readSingle(request.query.search as string | string[] | undefined),
      status: readSingle(request.query.status as string | string[] | undefined)
    });

    return ok(response, items, 200);
  })
);

ordersRouter.get(
  '/purchase-orders',
  asyncHandler(async (request, response) => {
    const items = listPurchaseOrders({
      search: readSingle(request.query.search as string | string[] | undefined),
      status: readSingle(request.query.status as string | string[] | undefined)
    });

    return ok(response, items, 200);
  })
);

ordersRouter.get(
  '/purchase-orders/:id',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);
    const item = getPurchaseOrderById(id);

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'PURCHASE_ORDER_NOT_FOUND',
        message: 'Purchase order not found'
      });
    }

    return ok(response, item, 200);
  })
);

ordersRouter.post(
  '/purchase-orders',
  asyncHandler(async (request, response) => {
    const supplierName = String(request.body?.supplierName ?? '').trim();
    const quotationNo = String(request.body?.quotationNo ?? '').trim();
    const itemCount = Number(request.body?.itemCount);
    const totalAmount = Number(request.body?.totalAmount);
    const currency = String(request.body?.currency ?? '').trim();
    const expectedDate = String(request.body?.expectedDate ?? '').trim();
    const status = String(request.body?.status ?? '').trim() as PurchaseOrderStatus;

    if (!supplierName) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'supplierName is required'
      });
    }

    if (!Number.isInteger(itemCount) || itemCount <= 0) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'itemCount must be a whole number greater than 0'
      });
    }

    if (Number.isNaN(totalAmount) || totalAmount < 0) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'totalAmount must be a valid number 0 or greater'
      });
    }

    if (!currency) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'currency is required'
      });
    }

    if (!expectedDate) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'expectedDate is required'
      });
    }

    if (!purchaseOrderStatuses.includes(status)) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'status must be one of: draft, issued, partially_received, received'
      });
    }

    const item = createPurchaseOrder({
      supplierName,
      quotationNo: quotationNo || undefined,
      itemCount,
      totalAmount,
      currency,
      expectedDate,
      status
    });

    return created(response, item);
  })
);

ordersRouter.get(
  '/goods-received-notes',
  asyncHandler(async (request, response) => {
    const items = listGRNs({
      search: readSingle(request.query.search as string | string[] | undefined),
      status: readSingle(request.query.status as string | string[] | undefined)
    });

    return ok(response, items, 200);
  })
);

ordersRouter.get(
  '/goods-received-notes/:id',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);
    const item = getGRNById(id);

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'GRN_NOT_FOUND',
        message: 'Goods received note not found'
      });
    }

    return ok(response, item, 200);
  })
);

ordersRouter.post(
  '/goods-received-notes',
  asyncHandler(async (request, response) => {
    const poNo = String(request.body?.poNo ?? '').trim();
    const supplierName = String(request.body?.supplierName ?? '').trim();
    const receivedLines = Number(request.body?.receivedLines);
    const receivedQty = Number(request.body?.receivedQty);
    const status = String(request.body?.status ?? '').trim() as GRNStatus;

    if (!poNo) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'poNo is required'
      });
    }

    if (!supplierName) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'supplierName is required'
      });
    }

    if (Number.isNaN(receivedLines) || receivedLines < 0) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'receivedLines must be a valid number 0 or greater'
      });
    }

    if (Number.isNaN(receivedQty) || receivedQty < 0) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'receivedQty must be a valid number 0 or greater'
      });
    }

    if (!grnStatuses.includes(status)) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'status must be one of: draft, posted'
      });
    }

    const item = createGRN({
      poNo,
      supplierName,
      receivedLines,
      receivedQty,
      status
    });

    return created(response, item);
  })
);