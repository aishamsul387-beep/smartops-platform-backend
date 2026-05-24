import { execute, isPostgresEnabled, queryRows } from '../../infrastructure/db/postgres';

export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type InventoryItemType =
  | 'raw_material'
  | 'finished_goods'
  | 'packaging'
  | 'spare_part'
  | 'consumable';

export interface InventoryRecord {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  itemType: InventoryItemType;
  brand: string;
  model: string;
  preferredSupplierName: string;
  standardCost: number;
  averageCost: number;
  currency: string;
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
  itemType: InventoryItemType;
  brand: string;
  model: string;
  preferredSupplierName: string;
  standardCost: number;
  averageCost: number;
  currency: string;
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
    itemType: 'raw_material',
    brand: 'PrimeSteel',
    model: 'Sheet-A',
    preferredSupplierName: 'Prime Steel Supply',
    standardCost: 15.5,
    averageCost: 15.2,
    currency: 'USD',
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
    itemType: 'packaging',
    brand: 'PackRight',
    model: 'Medium-Box',
    preferredSupplierName: 'PackRight Industries',
    standardCost: 2.1,
    averageCost: 2.0,
    currency: 'USD',
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
    itemType: 'finished_goods',
    brand: 'ValveCore',
    model: 'X221',
    preferredSupplierName: 'ValveCore Manufacturing',
    standardCost: 110,
    averageCost: 108,
    currency: 'USD',
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

const INVENTORY_MASTER_BACKFILL = memoryInventoryStore.map((item) => ({
  id: item.id,
  itemType: item.itemType,
  brand: item.brand,
  model: item.model,
  preferredSupplierName: item.preferredSupplierName,
  standardCost: item.standardCost,
  averageCost: item.averageCost,
  currency: item.currency
}));

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
    itemType: String(row.item_type ?? 'raw_material') as InventoryItemType,
    brand: String(row.brand ?? ''),
    model: String(row.model ?? ''),
    preferredSupplierName: String(row.preferred_supplier_name ?? ''),
    standardCost: Number(row.standard_cost ?? 0),
    averageCost: Number(row.average_cost ?? 0),
    currency: String(row.currency ?? 'USD'),
    quantity: Number(row.quantity),
    reorderLevel: Number(row.reorder_level),
    minimumStockLevel: Number(row.minimum_stock_level ?? 0),
    maximumStockLevel: Number(row.maximum_stock_level ?? 0),
    unit: String(row.unit),
    warehouseLocation: String(row.warehouse_location),
    status: String(row.status) as InventoryStatus,
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

async function backfillExistingInventoryMasterData() {
  if (!isPostgresEnabled()) {
    return;
  }

  for (const item of INVENTORY_MASTER_BACKFILL) {
    await execute(
      `
      UPDATE inventory_items
      SET
        item_type = $2,
        brand = $3,
        model = $4,
        preferred_supplier_name = $5,
        standard_cost = $6,
        average_cost = $7,
        currency = $8,
        updated_at = NOW()
      WHERE id = $1
        AND (
          COALESCE(item_type, '') = ''
          OR ($2 <> 'raw_material' AND item_type = 'raw_material')
          OR COALESCE(brand, '') = ''
          OR COALESCE(model, '') = ''
          OR COALESCE(preferred_supplier_name, '') = ''
          OR COALESCE(standard_cost, 0) = 0
          OR COALESCE(average_cost, 0) = 0
          OR COALESCE(currency, '') = ''
        )
      `,
      [
        item.id,
        item.itemType,
        item.brand,
        item.model,
        item.preferredSupplierName,
        item.standardCost,
        item.averageCost,
        item.currency
      ]
    );
  }
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

  await execute(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'raw_material'`);
  await execute(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS brand TEXT NOT NULL DEFAULT ''`);
  await execute(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT ''`);
  await execute(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS preferred_supplier_name TEXT NOT NULL DEFAULT ''`);
  await execute(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS standard_cost NUMERIC NOT NULL DEFAULT 0`);
  await execute(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS average_cost NUMERIC NOT NULL DEFAULT 0`);
  await execute(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD'`);

  const rows = await queryRows<{ total: string }>(
    'SELECT COUNT(*)::text AS total FROM inventory_items'
  );

  const total = Number(rows[0]?.total ?? '0');

  if (total === 0) {
    for (const item of memoryInventoryStore) {
      await execute(
        `
        INSERT INTO inventory_items (
          id,
          sku,
          barcode,
          name,
          description,
          category,
          item_type,
          brand,
          model,
          preferred_supplier_name,
          standard_cost,
          average_cost,
          currency,
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
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
          $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
        )
        `,
        [
          item.id,
          item.sku,
          item.barcode,
          item.name,
          item.description,
          item.category,
          item.itemType,
          item.brand,
          item.model,
          item.preferredSupplierName,
          item.standardCost,
          item.averageCost,
          item.currency,
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

  await backfillExistingInventoryMasterData();

  initialized = true;
}

export async function listInventory(filters?: { search?: string; status?: string }) {
  if (!isPostgresEnabled()) {
    return memoryInventoryStore.filter((item) => {
      const okSearch = matchesSearch(
        [
          item.name,
          item.sku,
          item.category,
          item.itemType,
          item.barcode,
          item.description,
          item.brand,
          item.model,
          item.preferredSupplierName,
          item.currency
        ],
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
      item_type,
      brand,
      model,
      preferred_supplier_name,
      standard_cost,
      average_cost,
      currency,
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
        OR LOWER(item_type) LIKE $${index}
        OR LOWER(barcode) LIKE $${index}
        OR LOWER(description) LIKE $${index}
        OR LOWER(brand) LIKE $${index}
        OR LOWER(model) LIKE $${index}
        OR LOWER(preferred_supplier_name) LIKE $${index}
        OR LOWER(currency) LIKE $${index}
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
      item_type,
      brand,
      model,
      preferred_supplier_name,
      standard_cost,
      average_cost,
      currency,
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
    itemType: input.itemType,
    brand: input.brand,
    model: input.model,
    preferredSupplierName: input.preferredSupplierName,
    standardCost: input.standardCost,
    averageCost: input.averageCost,
    currency: input.currency,
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
      id,
      sku,
      barcode,
      name,
      description,
      category,
      item_type,
      brand,
      model,
      preferred_supplier_name,
      standard_cost,
      average_cost,
      currency,
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
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
      $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
    )
    `,
    [
      record.id,
      record.sku,
      record.barcode,
      record.name,
      record.description,
      record.category,
      record.itemType,
      record.brand,
      record.model,
      record.preferredSupplierName,
      record.standardCost,
      record.averageCost,
      record.currency,
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
    itemType: input.itemType,
    brand: input.brand,
    model: input.model,
    preferredSupplierName: input.preferredSupplierName,
    standardCost: input.standardCost,
    averageCost: input.averageCost,
    currency: input.currency,
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
      item_type = $7,
      brand = $8,
      model = $9,
      preferred_supplier_name = $10,
      standard_cost = $11,
      average_cost = $12,
      currency = $13,
      quantity = $14,
      reorder_level = $15,
      minimum_stock_level = $16,
      maximum_stock_level = $17,
      unit = $18,
      warehouse_location = $19,
      status = $20,
      is_active = $21,
      is_batch_tracked = $22,
      is_expiry_tracked = $23,
      is_serial_tracked = $24,
      base_uom_code = $25,
      purchase_uom_code = $26,
      sales_uom_code = $27,
      issue_uom_code = $28,
      uom_conversion_group_code = $29,
      allows_fraction = $30,
      notes = $31,
      updated_at = $32
    WHERE id = $1
    `,
    [
      updated.id,
      updated.sku,
      updated.barcode,
      updated.name,
      updated.description,
      updated.category,
      updated.itemType,
      updated.brand,
      updated.model,
      updated.preferredSupplierName,
      updated.standardCost,
      updated.averageCost,
      updated.currency,
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
    const index = memoryInventoryStore.findIndex((item) => item.id === id);

    if (index === -1) {
      return null;
    }

    memoryInventoryStore[index] = {
      ...memoryInventoryStore[index],
      isActive,
      updatedAt: new Date().toISOString()
    };

    return memoryInventoryStore[index];
  }

  await ensureInventoryTable();

  await execute(
    `
    UPDATE inventory_items
    SET is_active = $2, updated_at = $3
    WHERE id = $1
    `,
    [id, isActive, new Date().toISOString()]
  );

  return getInventoryById(id);
}

export function getInventoryPersistenceMode() {
  return isPostgresEnabled() ? 'postgres' : 'memory';
}