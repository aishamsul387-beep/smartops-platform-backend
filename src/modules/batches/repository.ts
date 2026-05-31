export type BatchStatus =
  | 'available'
  | 'blocked'
  | 'quarantine'
  | 'expired'
  | 'consumed';

export interface BatchRecord {
  id: string;
  inventoryItemId: string;
  batchNumber: string;
  lotNumber: string;
  supplierLotNumber: string;
  manufactureDate: string | null;
  expiryDate: string | null;
  receivedDate: string | null;
  supplierName: string;
  purchaseOrderNo: string;
  goodsReceivedNoteNo: string;
  unitCost: number;
  currency: string;
  receivedQty: number;
  availableQty: number;
  reservedQty: number;
  blockedQty: number;
  qaHoldQty: number;
  batchStatus: BatchStatus;
  warehouseLocation: string;
  zone: string;
  aisle: string;
  levelCode: string;
  bin: string;
  notes: string;
  updatedAt: string;
}

export interface BatchStatusHistoryRecord {
  id: string;
  batchId: string;
  inventoryItemId: string;
  batchNumber: string;
  previousStatus: BatchStatus;
  nextStatus: BatchStatus;
  notes: string;
  changedAt: string;
}

export interface CreateBatchInput {
  inventoryItemId: string;
  batchNumber: string;
  lotNumber: string;
  supplierLotNumber: string;
  manufactureDate: string | null;
  expiryDate: string | null;
  receivedDate: string | null;
  supplierName: string;
  purchaseOrderNo: string;
  goodsReceivedNoteNo: string;
  unitCost: number;
  currency: string;
  receivedQty: number;
  availableQty: number;
  reservedQty: number;
  blockedQty: number;
  qaHoldQty: number;
  batchStatus: BatchStatus;
  warehouseLocation: string;
  zone: string;
  aisle: string;
  levelCode: string;
  bin: string;
  notes: string;
}

let batchStore: BatchRecord[] = [
  {
    id: 'bat-001',
    inventoryItemId: 'inv-001',
    batchNumber: 'BATCH-STEEL-001',
    lotNumber: 'LOT-STEEL-001',
    supplierLotNumber: 'SUP-LOT-STEEL-001',
    manufactureDate: null,
    expiryDate: null,
    receivedDate: '2026-05-20',
    supplierName: 'Prime Steel Supply',
    purchaseOrderNo: 'PO-2026-001',
    goodsReceivedNoteNo: 'GRN-2026-001',
    unitCost: 52.08,
    currency: 'USD',
    receivedQty: 240,
    availableQty: 220,
    reservedQty: 20,
    blockedQty: 0,
    qaHoldQty: 0,
    batchStatus: 'available',
    warehouseLocation: 'A-01-01',
    zone: 'A',
    aisle: '01',
    levelCode: '01',
    bin: '01',
    notes: 'Seeded batch record',
    updatedAt: '2026-05-21T14:30:00.000Z'
  },
  {
    id: 'bat-002',
    inventoryItemId: 'inv-003',
    batchNumber: 'BATCH-VALVE-001',
    lotNumber: 'LOT-VALVE-001',
    supplierLotNumber: 'SUP-LOT-VALVE-001',
    manufactureDate: '2026-04-15',
    expiryDate: '2027-04-15',
    receivedDate: '2026-05-18',
    supplierName: 'ValveCore Manufacturing',
    purchaseOrderNo: 'PO-2026-003',
    goodsReceivedNoteNo: 'GRN-2026-002',
    unitCost: 110.71,
    currency: 'USD',
    receivedQty: 30,
    availableQty: 0,
    reservedQty: 0,
    blockedQty: 0,
    qaHoldQty: 30,
    batchStatus: 'quarantine',
    warehouseLocation: 'C-03-02',
    zone: 'C',
    aisle: '03',
    levelCode: '02',
    bin: '02',
    notes: 'Seeded batch record',
    updatedAt: '2026-05-21T15:10:00.000Z'
  }
];

let batchStatusHistoryStore: BatchStatusHistoryRecord[] = [
  {
    id: 'bsh-001',
    batchId: 'bat-001',
    inventoryItemId: 'inv-001',
    batchNumber: 'BATCH-STEEL-001',
    previousStatus: 'available',
    nextStatus: 'available',
    notes: 'Seeded initial status',
    changedAt: '2026-05-21T14:30:00.000Z'
  },
  {
    id: 'bsh-002',
    batchId: 'bat-002',
    inventoryItemId: 'inv-003',
    batchNumber: 'BATCH-VALVE-001',
    previousStatus: 'available',
    nextStatus: 'quarantine',
    notes: 'Seeded initial quarantine status',
    changedAt: '2026-05-21T15:10:00.000Z'
  }
];

function matchesSearch(values: string[], search?: string) {
  const normalized = String(search ?? '').trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(normalized));
}

export function __setBatchStore(items: BatchRecord[]) {
  batchStore = items;
}

export function getBatchPersistenceMode() {
  return 'memory';
}

export async function listBatches(filters?: {
  inventoryItemId?: string;
  status?: string;
  search?: string;
}) {
  return batchStore.filter((item) => {
    const inventoryItemId = String(filters?.inventoryItemId ?? '').trim();
    const status = String(filters?.status ?? '').trim();

    const okInventory = !inventoryItemId || item.inventoryItemId === inventoryItemId;
    const okStatus = !status || status === 'all' || item.batchStatus === status;

    const okSearch = matchesSearch(
      [
        item.batchNumber,
        item.lotNumber,
        item.supplierLotNumber,
        item.supplierName,
        item.purchaseOrderNo,
        item.goodsReceivedNoteNo,
        item.batchStatus,
        item.inventoryItemId
      ],
      filters?.search
    );

    return okInventory && okStatus && okSearch;
  });
}

export async function getBatchById(id: string) {
  return batchStore.find((item) => item.id === id) ?? null;
}

export function listBatchStatusHistory(batchId: string) {
  return [...batchStatusHistoryStore]
    .filter((item) => item.batchId === batchId)
    .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
}

export async function createBatch(input: CreateBatchInput) {
  const record: BatchRecord = {
    id: 'bat-' + Date.now(),
    inventoryItemId: input.inventoryItemId,
    batchNumber: input.batchNumber,
    lotNumber: input.lotNumber,
    supplierLotNumber: input.supplierLotNumber,
    manufactureDate: input.manufactureDate,
    expiryDate: input.expiryDate,
    receivedDate: input.receivedDate,
    supplierName: input.supplierName,
    purchaseOrderNo: input.purchaseOrderNo,
    goodsReceivedNoteNo: input.goodsReceivedNoteNo,
    unitCost: input.unitCost,
    currency: input.currency,
    receivedQty: input.receivedQty,
    availableQty: input.availableQty,
    reservedQty: input.reservedQty,
    blockedQty: input.blockedQty,
    qaHoldQty: input.qaHoldQty,
    batchStatus: input.batchStatus,
    warehouseLocation: input.warehouseLocation,
    zone: input.zone,
    aisle: input.aisle,
    levelCode: input.levelCode,
    bin: input.bin,
    notes: input.notes,
    updatedAt: new Date().toISOString()
  };

  batchStore = [record, ...batchStore];

  batchStatusHistoryStore = [
    {
      id: 'bsh-' + Date.now(),
      batchId: record.id,
      inventoryItemId: record.inventoryItemId,
      batchNumber: record.batchNumber,
      previousStatus: record.batchStatus,
      nextStatus: record.batchStatus,
      notes: record.notes || 'Batch created',
      changedAt: record.updatedAt
    },
    ...batchStatusHistoryStore
  ];

  return record;
}

export async function updateBatchStatus(
  id: string,
  nextStatus: BatchStatus,
  notes?: string
) {
  const index = batchStore.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const current = batchStore[index];

  const mergedNotes = [current.notes, notes]
    .filter((value) => String(value ?? '').trim())
    .join(' | ');

  const updated: BatchRecord = {
    ...current,
    batchStatus: nextStatus,
    notes: mergedNotes,
    updatedAt: new Date().toISOString()
  };

  batchStore[index] = updated;

  batchStatusHistoryStore = [
    {
      id: 'bsh-' + Date.now(),
      batchId: updated.id,
      inventoryItemId: updated.inventoryItemId,
      batchNumber: updated.batchNumber,
      previousStatus: current.batchStatus,
      nextStatus,
      notes: notes || `Status changed to ${nextStatus}`,
      changedAt: updated.updatedAt
    },
    ...batchStatusHistoryStore
  ];

  return updated;
}