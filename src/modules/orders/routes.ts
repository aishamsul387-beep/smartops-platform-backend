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
  getPurchaseOrderByNumber,
  issuePurchaseOrder,
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

    const rawLines = Array.isArray(request.body?.lines) ? request.body.lines : [];
    const lines = rawLines.map((line: any, index: number) => {
      const itemCode = String(line?.itemCode ?? '').trim();
      const itemName = String(line?.itemName ?? '').trim();
      const orderedQty = Number(line?.orderedQty);
      const unitCost = Number(line?.unitCost);
      const lineCurrency = String(line?.currency ?? currency).trim() || currency;
      const notes = String(line?.notes ?? '').trim();

      if (!itemCode) {
        throw new AppError({
          status: 400,
          code: 'VALIDATION_ERROR',
          message: `lines[${index}].itemCode is required`
        });
      }

      if (!itemName) {
        throw new AppError({
          status: 400,
          code: 'VALIDATION_ERROR',
          message: `lines[${index}].itemName is required`
        });
      }

      if (Number.isNaN(orderedQty) || orderedQty <= 0) {
        throw new AppError({
          status: 400,
          code: 'VALIDATION_ERROR',
          message: `lines[${index}].orderedQty must be greater than 0`
        });
      }

      if (Number.isNaN(unitCost) || unitCost < 0) {
        throw new AppError({
          status: 400,
          code: 'VALIDATION_ERROR',
          message: `lines[${index}].unitCost must be 0 or greater`
        });
      }

      return {
        inventoryItemId: String(line?.inventoryItemId ?? '').trim(),
        itemCode,
        itemName,
        orderedQty,
        unitCost,
        currency: lineCurrency,
        lineTotal: Number(line?.lineTotal ?? Number((orderedQty * unitCost).toFixed(2))),
        notes
      };
    });

    const item = createPurchaseOrder({
      supplierName,
      quotationNo: quotationNo || undefined,
      itemCount,
      totalAmount,
      currency,
      expectedDate,
      status,
      lines
    });

    return created(response, item);
  })
);

ordersRouter.patch(
  '/purchase-orders/:id/issue',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);
    const existing = getPurchaseOrderById(id);

    if (!existing) {
      throw new AppError({
        status: 404,
        code: 'PURCHASE_ORDER_NOT_FOUND',
        message: 'Purchase order not found'
      });
    }

    if (existing.status !== 'draft') {
      throw new AppError({
        status: 400,
        code: 'PURCHASE_ORDER_NOT_DRAFT',
        message: 'Only draft purchase orders can be issued'
      });
    }

    const item = issuePurchaseOrder(id);

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
    const purchaseOrderLineId = String(request.body?.purchaseOrderLineId ?? '').trim();
    const inventoryItemId = String(request.body?.inventoryItemId ?? '').trim();
    const supplierName = String(request.body?.supplierName ?? '').trim();
    const batchNumber = String(request.body?.batchNumber ?? '').trim();
    const lotNumber = String(request.body?.lotNumber ?? '').trim();
    const supplierLotNumber = String(request.body?.supplierLotNumber ?? '').trim();
    const manufactureDate = String(request.body?.manufactureDate ?? '').trim() || null;
    const expiryDate = String(request.body?.expiryDate ?? '').trim() || null;
    const receivedDate = String(request.body?.receivedDate ?? '').trim() || null;
    const receivedLines = Number(request.body?.receivedLines);
    const receivedQty = Number(request.body?.receivedQty);
    const status = String(request.body?.status ?? '').trim() as GRNStatus;
    const warehouseLocation = String(request.body?.warehouseLocation ?? '').trim();
    const zone = String(request.body?.zone ?? '').trim();
    const aisle = String(request.body?.aisle ?? '').trim();
    const levelCode = String(request.body?.levelCode ?? '').trim();
    const bin = String(request.body?.bin ?? '').trim();

    if (!poNo) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'poNo is required'
      });
    }

    const purchaseOrder = getPurchaseOrderByNumber(poNo);

    if (!purchaseOrder) {
      throw new AppError({
        status: 404,
        code: 'PURCHASE_ORDER_NOT_FOUND',
        message: 'Referenced purchase order was not found'
      });
    }

    if (purchaseOrder.status === 'draft') {
      throw new AppError({
        status: 400,
        code: 'PURCHASE_ORDER_NOT_ISSUED',
        message: 'Purchase order must be issued before receiving goods'
      });
    }

    if (!purchaseOrderLineId) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'purchaseOrderLineId is required'
      });
    }

    if (!inventoryItemId) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'inventoryItemId is required'
      });
    }

    const matchingLine = purchaseOrder.lines.find(
      (line) => line.id === purchaseOrderLineId && line.inventoryItemId === inventoryItemId
    );

    if (!matchingLine) {
      throw new AppError({
        status: 400,
        code: 'PURCHASE_ORDER_LINE_NOT_FOUND',
        message: 'Selected purchase order line does not match the referenced inventory item'
      });
    }

    const remainingQty = Math.max(matchingLine.orderedQty - matchingLine.receivedQty, 0);

    if (remainingQty <= 0) {
      throw new AppError({
        status: 400,
        code: 'PURCHASE_ORDER_LINE_FULLY_RECEIVED',
        message: 'Selected purchase order line is already fully received'
      });
    }

    if (!supplierName) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'supplierName is required'
      });
    }

    if (!batchNumber) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'batchNumber is required'
      });
    }

    if (Number.isNaN(receivedLines) || receivedLines <= 0) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'receivedLines must be greater than 0'
      });
    }

    if (Number.isNaN(receivedQty) || receivedQty <= 0) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'receivedQty must be greater than 0'
      });
    }

    if (receivedQty > remainingQty) {
      throw new AppError({
        status: 400,
        code: 'OVER_RECEIPT_NOT_ALLOWED',
        message: `Received quantity cannot exceed remaining PO quantity (${remainingQty})`
      });
    }

    if (!grnStatuses.includes(status)) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'status must be one of: draft, posted'
      });
    }

    const item = await createGRN({
      poNo,
      purchaseOrderLineId,
      inventoryItemId,
      supplierName,
      batchNumber,
      lotNumber,
      supplierLotNumber,
      manufactureDate,
      expiryDate,
      receivedDate,
      receivedLines,
      receivedQty,
      status,
      warehouseLocation,
      zone,
      aisle,
      levelCode,
      bin
    });

    return created(response, item);
  })
);