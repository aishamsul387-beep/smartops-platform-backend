export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected';
export type PurchaseOrderStatus = 'draft' | 'issued' | 'partially_received' | 'received';
export type GRNStatus = 'draft' | 'posted';

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
}

export interface GRNRecord {
  id: string;
  grnNo: string;
  poNo: string;
  supplierName: string;
  receivedLines: number;
  receivedQty: number;
  status: GRNStatus;
  postedAt: string;
}

export interface CreatePurchaseOrderInput {
  supplierName: string;
  quotationNo?: string;
  itemCount: number;
  totalAmount: number;
  currency: string;
  status: PurchaseOrderStatus;
  expectedDate: string;
}

export interface CreateGRNInput {
  poNo: string;
  supplierName: string;
  receivedLines: number;
  receivedQty: number;
  status: GRNStatus;
}

const quotationStore: QuotationRecord[] = [
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
    itemCount: 4,
    totalAmount: 12500,
    currency: 'USD',
    status: 'issued',
    expectedDate: '2026-05-25T00:00:00.000Z',
    createdAt: '2026-05-21T11:20:00.000Z'
  },
  {
    id: 'po-002',
    poNo: 'PO-2026-002',
    supplierName: 'PackRight Industries',
    quotationNo: 'QT-2026-002',
    itemCount: 2,
    totalAmount: 1800,
    currency: 'USD',
    status: 'partially_received',
    expectedDate: '2026-05-24T00:00:00.000Z',
    createdAt: '2026-05-21T12:10:00.000Z'
  },
  {
    id: 'po-003',
    poNo: 'PO-2026-003',
    supplierName: 'ValveCore Manufacturing',
    quotationNo: 'QT-2026-003',
    itemCount: 6,
    totalAmount: 9300,
    currency: 'USD',
    status: 'draft',
    expectedDate: '2026-05-28T00:00:00.000Z',
    createdAt: '2026-05-21T13:00:00.000Z'
  }
];

let grnStore: GRNRecord[] = [
  {
    id: 'grn-001',
    grnNo: 'GRN-2026-001',
    poNo: 'PO-2026-002',
    supplierName: 'PackRight Industries',
    receivedLines: 1,
    receivedQty: 35,
    status: 'posted',
    postedAt: '2026-05-21T14:30:00.000Z'
  },
  {
    id: 'grn-002',
    grnNo: 'GRN-2026-002',
    poNo: 'PO-2026-001',
    supplierName: 'Prime Steel Supply',
    receivedLines: 0,
    receivedQty: 0,
    status: 'draft',
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

export function getOrdersSummary() {
  return {
    quotations: quotationStore.length,
    purchaseOrders: purchaseOrderStore.length,
    goodsReceivedNotes: grnStore.length,
    pendingReceipts: purchaseOrderStore.filter(
      (item) => item.status === 'issued' || item.status === 'partially_received'
    ).length
  };
}

export function listQuotations(filters?: { search?: string; status?: string }) {
  return quotationStore.filter((item) => {
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
      [item.poNo, item.supplierName, item.quotationNo || '', item.status],
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
  const record: PurchaseOrderRecord = {
    id: 'po-' + Date.now(),
    poNo: nextPONumber(),
    supplierName: input.supplierName,
    quotationNo: input.quotationNo || undefined,
    itemCount: input.itemCount,
    totalAmount: input.totalAmount,
    currency: input.currency,
    status: input.status,
    expectedDate: input.expectedDate,
    createdAt: new Date().toISOString()
  };

  purchaseOrderStore = [record, ...purchaseOrderStore];
  return record;
}

export function listGRNs(filters?: { search?: string; status?: string }) {
  return grnStore.filter((item) => {
    const okSearch = matchesSearch(
      [item.grnNo, item.poNo, item.supplierName, item.status],
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

export function createGRN(input: CreateGRNInput) {
  const record: GRNRecord = {
    id: 'grn-' + Date.now(),
    grnNo: nextGRNNumber(),
    poNo: input.poNo,
    supplierName: input.supplierName,
    receivedLines: input.receivedLines,
    receivedQty: input.receivedQty,
    status: input.status,
    postedAt: new Date().toISOString()
  };

  grnStore = [record, ...grnStore];
  return record;
}