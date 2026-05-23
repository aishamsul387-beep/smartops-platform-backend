import { env } from '../../config/env';
import { execute, isPostgresEnabled, queryRows } from '../../infrastructure/db/postgres';

export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface InventoryRecord {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  minimumStockLevel: number;
  maximumStockLevel: number;
  unit: string;
  warehouseLocation: string;
  status: InventoryStatus;
  isActive: boolean;
  isBatchTracked: boolean;
  isExpiryTracked: boolean;
  isSerialTracked: boolean;
  baseUomCode: string;
  purchaseUomCode: string;
  salesUomCode: string;
  issueUomCode: string;
  uomConversionGroupCode: string;
  allowsFraction: boolean;
  notes: string;
  updatedAt: string;
}

export interface CreateInventoryInput {
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  minimumStockLevel: number;
  maximumStockLevel: number;
  unit: string;
  warehouseLocation: string;
  status: InventoryStatus;
  isActive: boolean;
  isBatchTracked: boolean;
  isExpiryTracked: boolean;
  isSerialTracked: boolean;
  baseUomCode: string;
  purchaseUomCode: string;
  salesUomCode: string;
  issueUomCode: string;
  uomConversionGroupCode: string;
  allowsFraction: boolean;
  notes: string;
}

export interface UpdateInventoryInput extends CreateInventoryInput {
  id: string;
}

let initialized = false;

let memoryInventoryStore: InventoryRecord[] = [
  {
    id: 'inv-001',
    sku: 'RM-STEEL-001',
    barcode: '9555000000011',
    name: 'Steel Sheet A',
    description: 'Primary steel sheet material for fabrication use.',
    category: 'Raw Material',
    quantity: 240,
    reorderLevel: 80,
    minimumStockLevel: 60,
    maximumStockLevel: 500,
    unit: 'pcs',
    warehouseLocation: 'A-01-01',
    status: 'in_stock',
    isActive: true,
    isBatchTracked: true,
    isExpiryTracked: false,
    isSerialTracked: false,
    baseUomCode: 'PCS',
    purchaseUomCode: 'CTN',
    salesUomCode: 'PCS',
    issueUomCode: 'PCS',
    uomConversionGroupCode: 'PK_STD_001',
    allowsFraction: false,
    notes: 'Standard steel receiving profile.',
    updatedAt: '2026-05-20T08:30:00.000Z'
  },
  {
    id: 'inv-002',
    sku: 'PK-BOX-010',
    barcode: '9555000000028',
    name: 'Carton Box Medium',
    description: 'Medium-size packaging carton for outbound packing.',
    category: 'Packaging',
    quantity: 35,
    reorderLevel: 50,
    minimumStockLevel: 40,
    maximumStockLevel: 300,
    unit: 'box',
    warehouseLocation: 'B-02-04',
    status: 'low_stock',
    isActive: true,
    isBatchTracked: false,
    isExpiryTracked: false,
    isSerialTracked: false,
    baseUomCode: 'BOX',
    purchaseUomCode: 'CTN',
    salesUomCode: 'BOX',
    issueUomCode: 'BOX',
    uomConversionGroupCode: 'PK_STD_001',
    allowsFraction: false,
    notes: 'Packaging material.',
    updatedAt: '2026-05-20T09:00:00.000Z'
  },
  {
    id: 'inv-003',
    sku: 'FG-VALVE-221',
    barcode: '9555000000035',
    name: 'Control Valve X',
    description: 'Finished control valve item for industrial order fulfillment.',
    category: 'Finished Goods',
    quantity: 0,
    reorderLevel: 20,
    minimumStockLevel: 15,
    maximumStockLevel: 120,
    unit: 'pcs',
    warehouseLocation: 'C-03-02',
    status: 'out_of_stock',
    isActive: true,
    isBatchTracked: true,
    isExpiryTracked: true,
    isSerialTracked: false,
    baseUomCode: 'PCS',
    purchaseUomCode: 'BOX',
    salesUomCode: 'PCS',
    issueUomCode: 'PCS',
    uomConversionGroupCode: 'PK_STD_001',
    allowsFraction: false,
    notes: 'Requires traceability through batch/expiry flow.',
    updatedAt: '2026-05-20T10:15:00.000Z'
  }
];

function matchesSearch(values: string[], search?: string) {
  const normalized = String(search ?? '').trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(normalized));
}

function mapRow(row: any): InventoryRecord {
  return {
    id: String(row.id),
    sku: String(row.sku),
    barcode: String(row.barcode ?? ''),
    name: String(row.name),
    description: String(row.description ?? ''),
    category: String(row.category),
    quantity: Number(row.quantity),
    reorderLevel: Number(row.reorder_level),
    minimumStockLevel: Number(row.minimum_stock_level ?? 0),
    maximumStockLevel: Number(row.maximum_stock_level ?? 0),
    unit: String(row.unit),
    warehouseLocation: String(row.warehouse_location),
    status: row.status as InventoryStatus,
    isActive: Boolean(row.is_active),
    isBatchTracked: Boolean(row.is_batch_tracked),
    isExpiryTracked: Boolean(row.is_expiry_tracked),
    isSerialTracked: Boolean(row.is_serial_tracked),
    baseUomCode: String(row.base_uom_code ?? ''),
    purchaseUomCode: String(row.purchase_uom_code ?? ''),
    salesUomCode: String(row.sales_uom_code ?? ''),
    issueUomCode: String(row.issue_uom_code ?? ''),
    uomConversionGroupCode: String(row.uom_conversion_group_code ?? ''),
    allowsFraction: Boolean(row.allows_fraction),
    notes: String(row.notes ?? ''),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export async function ensureInventoryTable() {
  if (!isPostgresEnabled() || initialized) {
    return;
  }

  await execute(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      barcode TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      quantity NUMERIC NOT NULL,
      reorder_level NUMERIC NOT NULL,
      minimum_stock_level NUMERIC NOT NULL DEFAULT 0,
      maximum_stock_level NUMERIC NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      warehouse_location TEXT NOT NULL,
      status TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_batch_tracked BOOLEAN NOT NULL DEFAULT FALSE,
      is_expiry_tracked BOOLEAN NOT NULL DEFAULT FALSE,
      is_serial_tracked BOOLEAN NOT NULL DEFAULT FALSE,
      base_uom_code TEXT NOT NULL DEFAULT '',
      purchase_uom_code TEXT NOT NULL DEFAULT '',
      sales_uom_code TEXT NOT NULL DEFAULT '',
      issue_uom_code TEXT NOT NULL DEFAULT '',
      uom_conversion_group_code TEXT NOT NULL DEFAULT '',
      allows_fraction BOOLEAN NOT NULL DEFAULT FALSE,
      notes TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const rows = await queryRows<{ total: string }>('SELECT COUNT(*)::text AS total FROM inventory_items');
  const total = Number(rows[0]?.total ?? '0');

  if (total === 0) {
    for (const item of memoryInventoryStore) {
      await execute(
        `
        INSERT INTO inventory_items (
          id, sku, barcode, name, description, category, quantity, reorder_level,
          minimum_stock_level, maximum_stock_level, unit, warehouse_location, status,
          is_active, is_batch_tracked, is_expiry_tracked, is_serial_tracked,
          base_uom_code, purchase_uom_code, sales_uom_code, issue_uom_code,
          uom_conversion_group_code, allows_fraction, notes, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,
          $9,$10,$11,$12,$13,
          $14,$15,$16,$17,
          $18,$19,$20,$21,
          $22,$23,$24,$25
        )
        `,
        [
          item.id,
          item.sku,
          item.barcode,
          item.name,
          item.description,
          item.category,
          item.quantity,
          item.reorderLevel,
          item.minimumStockLevel,
          item.maximumStockLevel,
          item.unit,
          item.warehouseLocation,
          item.status,
          item.isActive,
          item.isBatchTracked,
          item.isExpiryTracked,
          item.isSerialTracked,
          item.baseUomCode,
          item.purchaseUomCode,
          item.salesUomCode,
          item.issueUomCode,
          item.uomConversionGroupCode,
          item.allowsFraction,
          item.notes,
          item.updatedAt
        ]
      );
    }
  }

  initialized = true;
}

export async function listInventory(filters?: { search?: string; status?: string }) {
  if (!isPostgresEnabled()) {
    return memoryInventoryStore.filter((item) => {
      const okSearch = matchesSearch(
        [item.name, item.sku, item.category, item.barcode, item.description],
        filters?.search
      );
      const status = String(filters?.status ?? '').trim();
      const okStatus = !status || status === 'all' || item.status === status;
      return okSearch && okStatus;
    });
  }

  await ensureInventoryTable();

  const search = String(filters?.search ?? '').trim().toLowerCase();
  const status = String(filters?.status ?? '').trim();

  let query = `
    SELECT
      id,
      sku,
      barcode,
      name,
      description,
      category,
      quantity,
      reorder_level,
      minimum_stock_level,
      maximum_stock_level,
      unit,
      warehouse_location,
      status,
      is_active,
      is_batch_tracked,
      is_expiry_tracked,
      is_serial_tracked,
      base_uom_code,
      purchase_uom_code,
      sales_uom_code,
      issue_uom_code,
      uom_conversion_group_code,
      allows_fraction,
      notes,
      updated_at
    FROM inventory_items
    WHERE 1=1
  `;

  const params: unknown[] = [];
  let index = 1;

  if (search) {
    query += `
      AND (
        LOWER(name) LIKE $${index}
        OR LOWER(sku) LIKE $${index}
        OR LOWER(category) LIKE $${index}
        OR LOWER(barcode) LIKE $${index}
        OR LOWER(description) LIKE $${index}
      )
    `;
    params.push(`%${search}%`);
    index += 1;
  }

  if (status && status !== 'all') {
    query += ` AND status = $${index}`;
    params.push(status);
    index += 1;
  }

  query += ' ORDER BY updated_at DESC';

  const rows = await queryRows(query, params);
  return rows.map(mapRow);
}

export async function getInventoryById(id: string) {
  if (!isPostgresEnabled()) {
    return memoryInventoryStore.find((item) => item.id === id) ?? null;
  }

  await ensureInventoryTable();

  const rows = await queryRows(
    `
    SELECT
      id,
      sku,
      barcode,
      name,
      description,
      category,
      quantity,
      reorder_level,
      minimum_stock_level,
      maximum_stock_level,
      unit,
      warehouse_location,
      status,
      is_active,
      is_batch_tracked,
      is_expiry_tracked,
      is_serial_tracked,
      base_uom_code,
      purchase_uom_code,
      sales_uom_code,
      issue_uom_code,
      uom_conversion_group_code,
      allows_fraction,
      notes,
      updated_at
    FROM inventory_items
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

export async function createInventory(input: CreateInventoryInput) {
  const record: InventoryRecord = {
    id: 'inv-' + Date.now(),
    sku: input.sku,
    barcode: input.barcode,
    name: input.name,
    description: input.description,
    category: input.category,
    quantity: input.quantity,
    reorderLevel: input.reorderLevel,
    minimumStockLevel: input.minimumStockLevel,
    maximumStockLevel: input.maximumStockLevel,
    unit: input.unit,
    warehouseLocation: input.warehouseLocation,
    status: input.status,
    isActive: input.isActive,
    isBatchTracked: input.isBatchTracked,
    isExpiryTracked: input.isExpiryTracked,
    isSerialTracked: input.isSerialTracked,
    baseUomCode: input.baseUomCode,
    purchaseUomCode: input.purchaseUomCode,
    salesUomCode: input.salesUomCode,
    issueUomCode: input.issueUomCode,
    uomConversionGroupCode: input.uomConversionGroupCode,
    allowsFraction: input.allowsFraction,
    notes: input.notes,
    updatedAt: new Date().toISOString()
  };

  if (!isPostgresEnabled()) {
    memoryInventoryStore = [record, ...memoryInventoryStore];
    return record;
  }

  await ensureInventoryTable();

  await execute(
    `
    INSERT INTO inventory_items (
      id, sku, barcode, name, description, category, quantity, reorder_level,
      minimum_stock_level, maximum_stock_level, unit, warehouse_location, status,
      is_active, is_batch_tracked, is_expiry_tracked, is_serial_tracked,
      base_uom_code, purchase_uom_code, sales_uom_code, issue_uom_code,
      uom_conversion_group_code, allows_fraction, notes, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,
      $9,$10,$11,$12,$13,
      $14,$15,$16,$17,
      $18,$19,$20,$21,
      $22,$23,$24,$25
    )
    `,
    [
      record.id,
      record.sku,
      record.barcode,
      record.name,
      record.description,
      record.category,
      record.quantity,
      record.reorderLevel,
      record.minimumStockLevel,
      record.maximumStockLevel,
      record.unit,
      record.warehouseLocation,
      record.status,
      record.isActive,
      record.isBatchTracked,
      record.isExpiryTracked,
      record.isSerialTracked,
      record.baseUomCode,
      record.purchaseUomCode,
      record.salesUomCode,
      record.issueUomCode,
      record.uomConversionGroupCode,
      record.allowsFraction,
      record.notes,
      record.updatedAt
    ]
  );

  return record;
}

export async function updateInventory(input: UpdateInventoryInput) {
  const updated: InventoryRecord = {
    id: input.id,
    sku: input.sku,
    barcode: input.barcode,
    name: input.name,
    description: input.description,
    category: input.category,
    quantity: input.quantity,
    reorderLevel: input.reorderLevel,
    minimumStockLevel: input.minimumStockLevel,
    maximumStockLevel: input.maximumStockLevel,
    unit: input.unit,
    warehouseLocation: input.warehouseLocation,
    status: input.status,
    isActive: input.isActive,
    isBatchTracked: input.isBatchTracked,
    isExpiryTracked: input.isExpiryTracked,
    isSerialTracked: input.isSerialTracked,
    baseUomCode: input.baseUomCode,
    purchaseUomCode: input.purchaseUomCode,
    salesUomCode: input.salesUomCode,
    issueUomCode: input.issueUomCode,
    uomConversionGroupCode: input.uomConversionGroupCode,
    allowsFraction: input.allowsFraction,
    notes: input.notes,
    updatedAt: new Date().toISOString()
  };

  if (!isPostgresEnabled()) {
    const index = memoryInventoryStore.findIndex((item) => item.id === input.id);
    if (index === -1) {
      return null;
    }

    memoryInventoryStore[index] = updated;
    return updated;
  }

  await ensureInventoryTable();

  await execute(
    `
    UPDATE inventory_items
    SET
      sku = $2,
      barcode = $3,
      name = $4,
      description = $5,
      category = $6,
      quantity = $7,
      reorder_level = $8,
      minimum_stock_level = $9,
      maximum_stock_level = $10,
      unit = $11,
      warehouse_location = $12,
      status = $13,
      is_active = $14,
      is_batch_tracked = $15,
      is_expiry_tracked = $16,
      is_serial_tracked = $17,
      base_uom_code = $18,
      purchase_uom_code = $19,
      sales_uom_code = $20,
      issue_uom_code = $21,
      uom_conversion_group_code = $22,
      allows_fraction = $23,
      notes = $24,
      updated_at = $25
    WHERE id = $1
    `,
    [
      updated.id,
      updated.sku,
      updated.barcode,
      updated.name,
      updated.description,
      updated.category,
      updated.quantity,
      updated.reorderLevel,
      updated.minimumStockLevel,
      updated.maximumStockLevel,
      updated.unit,
      updated.warehouseLocation,
      updated.status,
      updated.isActive,
      updated.isBatchTracked,
      updated.isExpiryTracked,
      updated.isSerialTracked,
      updated.baseUomCode,
      updated.purchaseUomCode,
      updated.salesUomCode,
      updated.issueUomCode,
      updated.uomConversionGroupCode,
      updated.allowsFraction,
      updated.notes,
      updated.updatedAt
    ]
  );

  return updated;
}

export async function setInventoryActiveStatus(id: string, isActive: boolean) {
  if (!isPostgresEnabled()) {
    const current = memoryInventoryStore.find((item) => item.id === id);
    if (!current) {
      return null;
    }

    const updated: InventoryRecord = {
      ...current,
      isActive,
      updatedAt: new Date().toISOString()
    };

    const index = memoryInventoryStore.findIndex((item) => item.id === id);
    memoryInventoryStore[index] = updated;
    return updated;
  }

  await ensureInventoryTable();

  await execute(
    `
    UPDATE inventory_items
    SET
      is_active = $2,
      updated_at = $3
    WHERE id = $1
    `,
    [id, isActive, new Date().toISOString()]
  );

  return getInventoryById(id);
}

export function getInventoryPersistenceMode() {
  return env.databaseUrl ? 'postgres' : 'memory';
}