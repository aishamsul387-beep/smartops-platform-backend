export type WarehouseLocationStatus = 'empty' | 'occupied' | 'blocked';
export type WarehouseLocationType = 'rack' | 'floor' | 'bulk' | 'staging' | 'quarantine';

export interface WarehouseLocationRecord {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  locationCode: string;
  zone: string;
  aisle: string;
  levelCode: string;
  bin: string;
  locationType: WarehouseLocationType;
  status: WarehouseLocationStatus;
  palletCapacity: number;
  usedPalletCapacity: number;
  cubicCapacityM3: number;
  usedCubicCapacityM3: number;
  isActive: boolean;
  notes: string;
  updatedAt: string;
}

export interface CreateWarehouseLocationInput {
  warehouseCode: string;
  warehouseName: string;
  locationCode: string;
  zone: string;
  aisle: string;
  levelCode: string;
  bin: string;
  locationType: WarehouseLocationType;
  status: WarehouseLocationStatus;
  palletCapacity: number;
  usedPalletCapacity: number;
  cubicCapacityM3: number;
  usedCubicCapacityM3: number;
  isActive: boolean;
  notes: string;
}

export interface UpdateWarehouseLocationInput extends CreateWarehouseLocationInput {
  id: string;
}

let warehouseLocationStore: WarehouseLocationRecord[] = [
  {
    id: 'loc-001',
    warehouseCode: 'WH-001',
    warehouseName: 'Main Warehouse',
    locationCode: 'A-01-01-01',
    zone: 'A',
    aisle: '01',
    levelCode: '01',
    bin: '01',
    locationType: 'rack',
    status: 'occupied',
    palletCapacity: 4,
    usedPalletCapacity: 2,
    cubicCapacityM3: 12,
    usedCubicCapacityM3: 6,
    isActive: true,
    notes: 'Primary raw material rack',
    updatedAt: '2026-05-28T08:00:00.000Z'
  },
  {
    id: 'loc-002',
    warehouseCode: 'WH-001',
    warehouseName: 'Main Warehouse',
    locationCode: 'B-02-04-02',
    zone: 'B',
    aisle: '02',
    levelCode: '04',
    bin: '02',
    locationType: 'rack',
    status: 'empty',
    palletCapacity: 6,
    usedPalletCapacity: 0,
    cubicCapacityM3: 18,
    usedCubicCapacityM3: 0,
    isActive: true,
    notes: 'Packaging reserve location',
    updatedAt: '2026-05-28T08:10:00.000Z'
  },
  {
    id: 'loc-003',
    warehouseCode: 'WH-001',
    warehouseName: 'Main Warehouse',
    locationCode: 'Q-01-01-01',
    zone: 'Q',
    aisle: '01',
    levelCode: '01',
    bin: '01',
    locationType: 'quarantine',
    status: 'blocked',
    palletCapacity: 2,
    usedPalletCapacity: 1,
    cubicCapacityM3: 5,
    usedCubicCapacityM3: 2,
    isActive: true,
    notes: 'Quarantine location',
    updatedAt: '2026-05-28T08:20:00.000Z'
  }
];

function matchesSearch(values: string[], search?: string) {
  const normalized = String(search ?? '').trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(normalized));
}

export function listWarehouseLocations(filters?: {
  search?: string;
  status?: string;
  type?: string;
  active?: string;
}) {
  return warehouseLocationStore.filter((item) => {
    const okSearch = matchesSearch(
      [
        item.warehouseCode,
        item.warehouseName,
        item.locationCode,
        item.zone,
        item.aisle,
        item.levelCode,
        item.bin,
        item.locationType,
        item.status
      ],
      filters?.search
    );

    const status = String(filters?.status ?? '').trim();
    const okStatus = !status || status === 'all' || item.status === status;

    const type = String(filters?.type ?? '').trim();
    const okType = !type || type === 'all' || item.locationType === type;

    const active = String(filters?.active ?? '').trim();
    const okActive =
      !active ||
      active === 'all' ||
      (active === 'active' && item.isActive) ||
      (active === 'inactive' && !item.isActive);

    return okSearch && okStatus && okType && okActive;
  });
}

export function getWarehouseLocationById(id: string) {
  return warehouseLocationStore.find((item) => item.id === id) ?? null;
}

export function createWarehouseLocation(input: CreateWarehouseLocationInput) {
  const record: WarehouseLocationRecord = {
    id: 'loc-' + Date.now(),
    warehouseCode: input.warehouseCode,
    warehouseName: input.warehouseName,
    locationCode: input.locationCode,
    zone: input.zone,
    aisle: input.aisle,
    levelCode: input.levelCode,
    bin: input.bin,
    locationType: input.locationType,
    status: input.status,
    palletCapacity: input.palletCapacity,
    usedPalletCapacity: input.usedPalletCapacity,
    cubicCapacityM3: input.cubicCapacityM3,
    usedCubicCapacityM3: input.usedCubicCapacityM3,
    isActive: input.isActive,
    notes: input.notes,
    updatedAt: new Date().toISOString()
  };

  warehouseLocationStore = [record, ...warehouseLocationStore];
  return record;
}

export function updateWarehouseLocation(input: UpdateWarehouseLocationInput) {
  const index = warehouseLocationStore.findIndex((item) => item.id === input.id);

  if (index === -1) {
    return null;
  }

  const updated: WarehouseLocationRecord = {
    id: input.id,
    warehouseCode: input.warehouseCode,
    warehouseName: input.warehouseName,
    locationCode: input.locationCode,
    zone: input.zone,
    aisle: input.aisle,
    levelCode: input.levelCode,
    bin: input.bin,
    locationType: input.locationType,
    status: input.status,
    palletCapacity: input.palletCapacity,
    usedPalletCapacity: input.usedPalletCapacity,
    cubicCapacityM3: input.cubicCapacityM3,
    usedCubicCapacityM3: input.usedCubicCapacityM3,
    isActive: input.isActive,
    notes: input.notes,
    updatedAt: new Date().toISOString()
  };

  warehouseLocationStore[index] = updated;
  return updated;
}

export function toggleWarehouseLocationActive(id: string, isActive: boolean) {
  const item = warehouseLocationStore.find((row) => row.id === id);

  if (!item) {
    return null;
  }

  item.isActive = isActive;
  item.updatedAt = new Date().toISOString();
  return item;
}