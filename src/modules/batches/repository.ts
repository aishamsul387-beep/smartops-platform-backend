import { env } from '../../config/env';
import { execute, isPostgresEnabled, queryRows } from '../../infrastructure/db/postgres';

export type BatchStatus = 'available' | 'blocked' | 'quarantine' | 'expired' | 'consumed';

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

let initialized = false;

let memoryBatchStore: BatchRecord[] = [
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
    unitCost: 15.5,
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
    notes: 'Primary steel receiving batch',
    updatedAt: '2026-05-22T09:00:00.000Z'
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
    unitCost: 110,
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
    notes: 'Awaiting QA release',
    updatedAt: '2026-05-22T09:10:00.000Z'
  }
];

function matchesSearch(values: string[], search?: string) {
  const normalized = String(search ?? '').trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(normalized));
}

function mapRow(row: any): BatchRecord {
  return {
    id: String(row.id),
    inventoryItemId: String(row.inventory_item_id),
    batchNumber: String(row.batch_number),
    lotNumber: String(row.lot_number ?? ''),
    supplierLotNumber: String(row.supplier_lot_number ?? ''),
    manufactureDate: row.manufacture_date ? String(row.manufacture_date) : null,
    expiryDate: row.expiry_date ? String(row.expiry_date) : null,
    receivedDate: row.received_date ? String(row.received_date) : null,
    supplierName: String(row.supplier_name ?? ''),
    purchaseOrderNo: String(row.purchase_order_no ?? ''),
    goodsReceivedNoteNo: String(row.goods_received_note_no ?? ''),
    unitCost: Number(row.unit_cost ?? 0),
    currency: String(row.currency ?? ''),
    receivedQty: Number(row.received_qty ?? 0),
    availableQty: Number(row.available_qty ?? 0),
    reservedQty: Number(row.reserved_qty ?? 0),
    blockedQty: Number(row.blocked_qty ?? 0),
    qaHoldQty: Number(row.qa_hold_qty ?? 0),
    batchStatus: row.batch_status as BatchStatus,
    warehouseLocation: String(row.warehouse_location ?? ''),
    zone: String(row.zone ?? ''),
    aisle: String(row.aisle ?? ''),
    levelCode: String(row.level_code ?? ''),
    bin: String(row.bin ?? ''),
    notes: String(row.notes ?? ''),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export async function ensureBatchTable() {
  if (!isPostgresEnabled() || initialized) {
    return;
  }

  await execute(`
    CREATE TABLE IF NOT EXISTS inventory_batches (
      id TEXT PRIMARY KEY,
      inventory_item_id TEXT NOT NULL,
      batch_number TEXT NOT NULL,
      lot_number TEXT NOT NULL DEFAULT '',
      supplier_lot_number TEXT NOT NULL DEFAULT '',
      manufacture_date DATE NULL,
      expiry_date DATE NULL,
      received_date DATE NULL,
      supplier_name TEXT NOT NULL DEFAULT '',
      purchase_order_no TEXT NOT NULL DEFAULT '',
      goods_received_note_no TEXT NOT NULL DEFAULT '',
      unit_cost NUMERIC NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT '',
      received_qty NUMERIC NOT NULL DEFAULT 0,
      available_qty NUMERIC NOT NULL DEFAULT 0,
      reserved_qty NUMERIC NOT NULL DEFAULT 0,
      blocked_qty NUMERIC NOT NULL DEFAULT 0,
      qa_hold_qty NUMERIC NOT NULL DEFAULT 0,
      batch_status TEXT NOT NULL,
      warehouse_location TEXT NOT NULL DEFAULT '',
      zone TEXT NOT NULL DEFAULT '',
      aisle TEXT NOT NULL DEFAULT '',
      level_code TEXT NOT NULL DEFAULT '',
      bin TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const rows = await queryRows<{ total: string }>(
    'SELECT COUNT(*)::text AS total FROM inventory_batches'
  );

  const total = Number(rows[0]?.total ?? '0');

  if (total === 0) {
    for (const item of memoryBatchStore) {
      await execute(
        `
        INSERT INTO inventory_batches (
          id, inventory_item_id, batch_number, lot_number, supplier_lot_number,
          manufacture_date, expiry_date, received_date, supplier_name, purchase_order_no,
          goods_received_note_no, unit_cost, currency, received_qty, available_qty,
          reserved_qty, blocked_qty, qa_hold_qty, batch_status, warehouse_location,
          zone, aisle, level_code, bin, notes, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,
          $16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26
        )
        `,
        [
          item.id,
          item.inventoryItemId,
          item.batchNumber,
          item.lotNumber,
          item.supplierLotNumber,
          item.manufactureDate,
          item.expiryDate,
          item.receivedDate,
          item.supplierName,
          item.purchaseOrderNo,
          item.goodsReceivedNoteNo,
          item.unitCost,
          item.currency,
          item.receivedQty,
          item.availableQty,
          item.reservedQty,
          item.blockedQty,
          item.qaHoldQty,
          item.batchStatus,
          item.warehouseLocation,
          item.zone,
          item.aisle,
          item.levelCode,
          item.bin,
          item.notes,
          item.updatedAt
        ]
      );
    }
  }

  initialized = true;
}

export async function listBatches(filters?: {
  inventoryItemId?: string;
  status?: string;
  search?: string;
}) {
  if (!isPostgresEnabled()) {
    return memoryBatchStore.filter((item) => {
      const okItem =
        !filters?.inventoryItemId || item.inventoryItemId === filters.inventoryItemId;

      const status = String(filters?.status ?? '').trim();
      const okStatus = !status || status === 'all' || item.batchStatus === status;

      const okSearch = matchesSearch(
        [
          item.batchNumber,
          item.lotNumber,
          item.supplierLotNumber,
          item.supplierName,
          item.purchaseOrderNo,
          item.goodsReceivedNoteNo
        ],
        filters?.search
      );

      return okItem && okStatus && okSearch;
    });
  }

  await ensureBatchTable();

  const inventoryItemId = String(filters?.inventoryItemId ?? '').trim();
  const status = String(filters?.status ?? '').trim();
  const search = String(filters?.search ?? '').trim().toLowerCase();

  let query = `
    SELECT
      id,
      inventory_item_id,
      batch_number,
      lot_number,
      supplier_lot_number,
      manufacture_date,
      expiry_date,
      received_date,
      supplier_name,
      purchase_order_no,
      goods_received_note_no,
      unit_cost,
      currency,
      received_qty,
      available_qty,
      reserved_qty,
      blocked_qty,
      qa_hold_qty,
      batch_status,
      warehouse_location,
      zone,
      aisle,
      level_code,
      bin,
      notes,
      updated_at
    FROM inventory_batches
    WHERE 1=1
  `;

  const params: unknown[] = [];
  let index = 1;

  if (inventoryItemId) {
    query += ` AND inventory_item_id = $${index}`;
    params.push(inventoryItemId);
    index += 1;
  }

  if (status && status !== 'all') {
    query += ` AND batch_status = $${index}`;
    params.push(status);
    index += 1;
  }

  if (search) {
    query += `
      AND (
        LOWER(batch_number) LIKE $${index}
        OR LOWER(lot_number) LIKE $${index}
        OR LOWER(supplier_lot_number) LIKE $${index}
        OR LOWER(supplier_name) LIKE $${index}
        OR LOWER(purchase_order_no) LIKE $${index}
        OR LOWER(goods_received_note_no) LIKE $${index}
      )
    `;
    params.push(`%${search}%`);
    index += 1;
  }

  query += ' ORDER BY updated_at DESC';

  const rows = await queryRows(query, params);
  return rows.map(mapRow);
}

export async function getBatchById(id: string) {
  if (!isPostgresEnabled()) {
    return memoryBatchStore.find((item) => item.id === id) ?? null;
  }

  await ensureBatchTable();

  const rows = await queryRows(
    `
    SELECT
      id,
      inventory_item_id,
      batch_number,
      lot_number,
      supplier_lot_number,
      manufacture_date,
      expiry_date,
      received_date,
      supplier_name,
      purchase_order_no,
      goods_received_note_no,
      unit_cost,
      currency,
      received_qty,
      available_qty,
      reserved_qty,
      blocked_qty,
      qa_hold_qty,
      batch_status,
      warehouse_location,
      zone,
      aisle,
      level_code,
      bin,
      notes,
      updated_at
    FROM inventory_batches
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapRow(rows[0]);
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

  if (!isPostgresEnabled()) {
    memoryBatchStore = [record, ...memoryBatchStore];
    return record;
  }

  await ensureBatchTable();

  await execute(
    `
    INSERT INTO inventory_batches (
      id, inventory_item_id, batch_number, lot_number, supplier_lot_number,
      manufacture_date, expiry_date, received_date, supplier_name, purchase_order_no,
      goods_received_note_no, unit_cost, currency, received_qty, available_qty,
      reserved_qty, blocked_qty, qa_hold_qty, batch_status, warehouse_location,
      zone, aisle, level_code, bin, notes, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,
      $6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,
      $16,$17,$18,$19,$20,
      $21,$22,$23,$24,$25,$26
    )
    `,
    [
      record.id,
      record.inventoryItemId,
      record.batchNumber,
      record.lotNumber,
      record.supplierLotNumber,
      record.manufactureDate,
      record.expiryDate,
      record.receivedDate,
      record.supplierName,
      record.purchaseOrderNo,
      record.goodsReceivedNoteNo,
      record.unitCost,
      record.currency,
      record.receivedQty,
      record.availableQty,
      record.reservedQty,
      record.blockedQty,
      record.qaHoldQty,
      record.batchStatus,
      record.warehouseLocation,
      record.zone,
      record.aisle,
      record.levelCode,
      record.bin,
      record.notes,
      record.updatedAt
    ]
  );

  return record;
}

export function getBatchPersistenceMode() {
  return env.databaseUrl ? 'postgres' : 'memory';
}