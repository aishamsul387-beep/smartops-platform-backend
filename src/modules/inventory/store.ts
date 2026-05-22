export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface InventoryRecord {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  unit: string;
  warehouseLocation: string;
  status: InventoryStatus;
  updatedAt: string;
}

export interface CreateInventoryInput {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  unit: string;
  warehouseLocation: string;
  status: InventoryStatus;
}

let inventoryStore: InventoryRecord[] = [
  {
    id: 'inv-001',
    sku: 'RM-STEEL-001',
    name: 'Steel Sheet A',
    category: 'Raw Material',
    quantity: 240,
    reorderLevel: 80,
    unit: 'pcs',
    warehouseLocation: 'A-01-01',
    status: 'in_stock',
    updatedAt: '2026-05-20T08:30:00.000Z'
  },
  {
    id: 'inv-002',
    sku: 'PK-BOX-010',
    name: 'Carton Box Medium',
    category: 'Packaging',
    quantity: 35,
    reorderLevel: 50,
    unit: 'box',
    warehouseLocation: 'B-02-04',
    status: 'low_stock',
    updatedAt: '2026-05-20T09:00:00.000Z'
  },
  {
    id: 'inv-003',
    sku: 'FG-VALVE-221',
    name: 'Control Valve X',
    category: 'Finished Goods',
    quantity: 0,
    reorderLevel: 20,
    unit: 'pcs',
    warehouseLocation: 'C-03-02',
    status: 'out_of_stock',
    updatedAt: '2026-05-20T10:15:00.000Z'
  }
];

export function listInventory(filters?: { search?: string; status?: string }) {
  const search = String(filters?.search ?? '').trim().toLowerCase();
  const status = String(filters?.status ?? '').trim();

  return inventoryStore.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search) ||
      item.sku.toLowerCase().includes(search) ||
      item.category.toLowerCase().includes(search);

    const matchesStatus = !status || status === 'all' || item.status === status;

    return matchesSearch && matchesStatus;
  });
}

export function getInventoryById(id: string) {
  return inventoryStore.find((item) => item.id === id) ?? null;
}

export function createInventory(input: CreateInventoryInput) {
  const nextRecord: InventoryRecord = {
    id: 'inv-' + Date.now(),
    sku: input.sku,
    name: input.name,
    category: input.category,
    quantity: input.quantity,
    reorderLevel: input.reorderLevel,
    unit: input.unit,
    warehouseLocation: input.warehouseLocation,
    status: input.status,
    updatedAt: new Date().toISOString()
  };

  inventoryStore = [nextRecord, ...inventoryStore];

  return nextRecord;
}
