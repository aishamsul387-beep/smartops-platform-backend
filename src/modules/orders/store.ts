import { createBatch, type BatchStatus } from '../batches/repository';

export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected';
export type PurchaseOrderStatus = 'draft' | 'issued' | 'partially_received' | 'received';
export type GRNStatus = 'draft' | 'posted';
export type PlanningSource = 'stock_control';
export type SupplierSource = 'inventory_master' | 'batch_history' | 'unassigned';

export interface PlanningContextRecord {
  planningSource: PlanningSource;
  inventoryItemId: string;
  itemCode: string;
  itemName: string;
  suggestedOrderQty: number;
  supplierSource: SupplierSource;
  estimatedReorderValue: number;
  reorderByDate: string;
}

export interface PurchaseOrderLineRecord {
  id: string;
  lineNo: number;
  inventoryItemId: string;
  itemCode: string;
  itemName: string;
  orderedQty: number;
  unitCost: number;
  currency: string;
  lineTotal: number;
  notes: string;
}

export interface QuotationRecord {
  id: string;
  quotationNo: string;
  supplierName: string;
  itemCount: number;
  totalAmount: number;
  currency: string;
  status: QuotationStatus;
  createdAt: string;
}

export interface PurchaseOrderRecord {
  id: string;
  poNo: string;
  supplierName: string;
  quotationNo?: string;
  itemCount: number;
  totalAmount: number;
  currency: string;
  status: PurchaseOrderStatus;
  expectedDate: string;
  createdAt: string;
  planningContext: PlanningContextRecord | null;
  lines: PurchaseOrderLineRecord[];
}

export interface GRNRecord {
  id: string;
  grnNo: string;
  poNo: string;
  inventoryItemId: string;
  supplierName: string;
  batchNumber: string;
  lotNumber: string;
  supplierLotNumber: string;
  manufactureDate: string | null;
  expiryDate: string | null;
  receivedDate: string | null;
  receivedLines: number;
  receivedQty: number;
  status: GRNStatus;
  warehouseLocation: string;
  zone: string;
  aisle: string;
  levelCode: string;
  bin: string;
  linkedBatchId: string | null;
  postedAt: string;
}

export interface OrdersDashboardSummary {
  quotations: number;
  purchaseOrders: number;
  goodsReceivedNotes: number;
  pendingReceipts: number;
}

export interface CreatePurchaseOrderLineInput {
  inventoryItemId: string;
  itemCode: string;
  itemName: string;
  orderedQty: number;
  unitCost: number;
  currency: string;
  lineTotal?: number;
  notes?: string;
}

export interface CreatePurchaseOrderInput {
  supplierName: string;
  quotationNo?: string;
  itemCount: number;
  totalAmount: number;
  currency: string;
  expectedDate: string;
  status: PurchaseOrderStatus;
  planningContext?: PlanningContextRecord | null;
  lines?: CreatePurchaseOrderLineInput[];
}

export interface CreateGRNInput {
  poNo: string;
  inventoryItemId: string;
  supplierName: string;
  batchNumber: string;
  lotNumber: string;
  supplierLotNumber: string;
  manufactureDate: string | null;
  expiryDate: string | null;
  receivedDate: string | null;
  receivedLines: number;
  receivedQty: number;
  status: GRNStatus;
  warehouseLocation: string;
  zone: string;
  aisle: string;
  levelCode: string;
  bin: string;
}

const MOCK_QUOTATIONS: QuotationRecord[] = [
  {
    id: 'qt-001',
    quotationNo: 'QT-2026-001',
    supplierName: 'Prime Steel Supply',
    itemCount: 4,
    totalAmount: 12500,
    currency: 'USD',
    status: 'sent',
    createdAt: '2026-05-21T08:00:00.000Z'
  },
  {
    id: 'qt-002',
    quotationNo: 'QT-2026-002',
    supplierName: 'PackRight Industries',
    itemCount: 2,
    totalAmount: 1800,
    currency: 'USD',
    status: 'approved',
    createdAt: '2026-05-21T09:15:00.000Z'
  },
  {
    id: 'qt-003',
    quotationNo: 'QT-2026-003',
    supplierName: 'ValveCore Manufacturing',
    itemCount: 6,
    totalAmount: 9300,
    currency: 'USD',
    status: 'draft',
    createdAt: '2026-05-21T10:45:00.000Z'
  }
];

let purchaseOrderStore: PurchaseOrderRecord[] = [
  {
    id: 'po-001',
    poNo: 'PO-2026-001',
    supplierName: 'Prime Steel Supply',
    quotationNo: 'QT-2026-001',
    itemCount: 1,
    totalAmount: 12500,
    currency: 'USD',
    status: 'issued',
    expectedDate: '2026-05-25T00:00:00.000Z',
    createdAt: '2026-05-21T11:20:00.000Z',
    planningContext: null,
    lines: [
      {
        id: 'pol-001',
        lineNo: 1,
        inventoryItemId: 'inv-001',
        itemCode: 'RM-STEEL-001',
        itemName: 'Steel Sheet A',
        orderedQty: 240,
        unitCost: 52.08,
        currency: 'USD',
        lineTotal: 12500,
        notes: 'Seeded demo PO line'
      }
    ]
  },
  {
    id: 'po-002',
    poNo: 'PO-2026-002',
    supplierName: 'PackRight Industries',
    quotationNo: 'QT-2026-002',
    itemCount: 1,
    totalAmount: 1800,
    currency: 'USD',
    status: 'partially_received',
    expectedDate: '2026-05-24T00:00:00.000Z',
    createdAt: '2026-05-21T12:10:00.000Z',
    planningContext: null,
    lines: [
      {
        id: 'pol-002',
        lineNo: 1,
        inventoryItemId: 'inv-002',
        itemCode: 'PK-BOX-010',
        itemName: 'Carton Box Medium',
        orderedQty: 900,
        unitCost: 2,
        currency: 'USD',
        lineTotal: 1800,
        notes: 'Seeded demo PO line'
      }
    ]
  },
  {
    id: 'po-003',
    poNo: 'PO-2026-003',
    supplierName: 'ValveCore Manufacturing',
    quotationNo: 'QT-2026-003',
    itemCount: 1,
    totalAmount: 9300,
    currency: 'USD',
    status: 'draft',
    expectedDate: '2026-05-28T00:00:00.000Z',
    createdAt: '2026-05-21T13:00:00.000Z',
    planningContext: null,
    lines: [
      {
        id: 'pol-003',
        lineNo: 1,
        inventoryItemId: 'inv-003',
        itemCode: 'FG-VALVE-221',
        itemName: 'Control Valve X',
        orderedQty: 84,
        unitCost: 110.71,
        currency: 'USD',
        lineTotal: 9300,
        notes: 'Seeded demo PO line'
      }
    ]
  }
];

let grnStore: GRNRecord[] = [
  {
    id: 'grn-001',
    grnNo: 'GRN-2026-001',
    poNo: 'PO-2026-001',
    inventoryItemId: 'inv-001',
    supplierName: 'Prime Steel Supply',
    batchNumber: 'BATCH-STEEL-001',
    lotNumber: 'LOT-STEEL-001',
    supplierLotNumber: 'SUP-LOT-STEEL-001',
    manufactureDate: null,
    expiryDate: null,
    receivedDate: '2026-05-20',
    receivedLines: 1,
    receivedQty: 240,
    status: 'posted',
    warehouseLocation: 'A-01-01',
    zone: 'A',
    aisle: '01',
    levelCode: '01',
    bin: '01',
    linkedBatchId: 'bat-001',
    postedAt: '2026-05-21T14:30:00.000Z'
  },
  {
    id: 'grn-002',
    grnNo: 'GRN-2026-002',
    poNo: 'PO-2026-003',
    inventoryItemId: 'inv-003',
    supplierName: 'ValveCore Manufacturing',
    batchNumber: 'BATCH-VALVE-001',
    lotNumber: 'LOT-VALVE-001',
    supplierLotNumber: 'SUP-LOT-VALVE-001',
    manufactureDate: '2026-04-15',
    expiryDate: '2027-04-15',
    receivedDate: '2026-05-18',
    receivedLines: 1,
    receivedQty: 30,
    status: 'draft',
    warehouseLocation: 'C-03-02',
    zone: 'C',
    aisle: '03',
    levelCode: '02',
    bin: '02',
    linkedBatchId: null,
    postedAt: '2026-05-21T15:10:00.000Z'
  }
];

function matchesSearch(values: string[], search?: string) {
  const normalized = String(search ?? '').trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(normalized));
}

function nextPONumber() {
  return `PO-${new Date().getFullYear()}-${String(purchaseOrderStore.length + 1).padStart(3, '0')}`;
}

function nextGRNNumber() {
  return `GRN-${new Date().getFullYear()}-${String(grnStore.length + 1).padStart(3, '0')}`;
}

export function getOrdersSummary(): OrdersDashboardSummary {
  return {
    quotations: MOCK_QUOTATIONS.length,
    purchaseOrders: purchaseOrderStore.length,
    goodsReceivedNotes: grnStore.length,
    pendingReceipts: purchaseOrderStore.filter(
      (item) => item.status === 'issued' || item.status === 'partially_received'
    ).length
  };
}

export function listQuotations(filters?: { search?: string; status?: string }) {
  return MOCK_QUOTATIONS.filter((item) => {
    const okSearch = matchesSearch(
      [item.quotationNo, item.supplierName, item.status],
      filters?.search
    );

    const status = String(filters?.status ?? '').trim();
    const okStatus = !status || status === 'all' || item.status === status;

    return okSearch && okStatus;
  });
}

export function listPurchaseOrders(filters?: { search?: string; status?: string }) {
  return purchaseOrderStore.filter((item) => {
    const okSearch = matchesSearch(
      [
        item.poNo,
        item.supplierName,
        item.quotationNo || '',
        item.status,
        item.planningContext?.itemCode || '',
        item.planningContext?.itemName || '',
        item.planningContext?.planningSource || '',
        ...item.lines.flatMap((line) => [line.itemCode, line.itemName])
      ],
      filters?.search
    );

    const status = String(filters?.status ?? '').trim();
    const okStatus = !status || status === 'all' || item.status === status;

    return okSearch && okStatus;
  });
}

export function getPurchaseOrderById(id: string) {
  return purchaseOrderStore.find((item) => item.id === id) ?? null;
}

export function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  const now = Date.now();

  const lines: PurchaseOrderLineRecord[] = (input.lines ?? []).map((line, index) => {
    const unitCost = Number(line.unitCost);
    const orderedQty = Number(line.orderedQty);
    const lineTotal =
      line.lineTotal !== undefined
        ? Number(line.lineTotal)
        : Number((orderedQty * unitCost).toFixed(2));

    return {
      id: `pol-${now}-${index + 1}`,
      lineNo: index + 1,
      inventoryItemId: line.inventoryItemId,
      itemCode: line.itemCode,
      itemName: line.itemName,
      orderedQty,
      unitCost,
      currency: line.currency || input.currency,
      lineTotal,
      notes: line.notes || ''
    };
  });

  const totalAmount =
    lines.length > 0
      ? Number(lines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2))
      : input.totalAmount;

  const itemCount = lines.length > 0 ? lines.length : input.itemCount;

  const record: PurchaseOrderRecord = {
    id: 'po-' + now,
    poNo: nextPONumber(),
    supplierName: input.supplierName,
    quotationNo: input.quotationNo || undefined,
    itemCount,
    totalAmount,
    currency: input.currency,
    status: input.status,
    expectedDate: input.expectedDate,
    createdAt: new Date().toISOString(),
    planningContext: input.planningContext ?? null,
    lines
  };

  purchaseOrderStore = [record, ...purchaseOrderStore];
  return record;
}

export function issuePurchaseOrder(id: string) {
  const index = purchaseOrderStore.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const current = purchaseOrderStore[index];

  const updated: PurchaseOrderRecord = {
    ...current,
    status: 'issued'
  };

  purchaseOrderStore[index] = updated;
  return updated;
}

export function listGRNs(filters?: { search?: string; status?: string }) {
  return grnStore.filter((item) => {
    const okSearch = matchesSearch(
      [
        item.grnNo,
        item.poNo,
        item.inventoryItemId,
        item.supplierName,
        item.batchNumber,
        item.lotNumber,
        item.supplierLotNumber,
        item.status
      ],
      filters?.search
    );

    const status = String(filters?.status ?? '').trim();
    const okStatus = !status || status === 'all' || item.status === status;

    return okSearch && okStatus;
  });
}

export function getGRNById(id: string) {
  return grnStore.find((item) => item.id === id) ?? null;
}

export async function createGRN(input: CreateGRNInput) {
  const record: GRNRecord = {
    id: 'grn-' + Date.now(),
    grnNo: nextGRNNumber(),
    poNo: input.poNo,
    inventoryItemId: input.inventoryItemId,
    supplierName: input.supplierName,
    batchNumber: input.batchNumber,
    lotNumber: input.lotNumber,
    supplierLotNumber: input.supplierLotNumber,
    manufactureDate: input.manufactureDate,
    expiryDate: input.expiryDate,
    receivedDate: input.receivedDate,
    receivedLines: input.receivedLines,
    receivedQty: input.receivedQty,
    status: input.status,
    warehouseLocation: input.warehouseLocation,
    zone: input.zone,
    aisle: input.aisle,
    levelCode: input.levelCode,
    bin: input.bin,
    linkedBatchId: null,
    postedAt: new Date().toISOString()
  };

  if (record.status === 'posted') {
    const batch = await createBatch({
      inventoryItemId: record.inventoryItemId,
      batchNumber: record.batchNumber,
      lotNumber: record.lotNumber,
      supplierLotNumber: record.supplierLotNumber,
      manufactureDate: record.manufactureDate,
      expiryDate: record.expiryDate,
      receivedDate: record.receivedDate,
      supplierName: record.supplierName,
      purchaseOrderNo: record.poNo,
      goodsReceivedNoteNo: record.grnNo,
      unitCost: 0,
      currency: 'USD',
      receivedQty: record.receivedQty,
      availableQty: record.receivedQty,
      reservedQty: 0,
      blockedQty: 0,
      qaHoldQty: 0,
      batchStatus: 'available' as BatchStatus,
      warehouseLocation: record.warehouseLocation,
      zone: record.zone,
      aisle: record.aisle,
      levelCode: record.levelCode,
      bin: record.bin,
      notes: `Auto-created from GRN ${record.grnNo}`
    });

    record.linkedBatchId = batch.id;
  }

  grnStore = [record, ...grnStore];
  return record;
}