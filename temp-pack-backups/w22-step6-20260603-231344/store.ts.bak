export type WarehouseLocationStatus = 'empty' | 'occupied' | 'blocked';
export type WarehouseLocationType =
  | 'rack'
  | 'floor'
  | 'bulk'
  | 'staging'
  | 'quarantine'
  | 'shelves'
  | 'island';

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

export interface WarehouseLocationImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{
    rowNumber: number;
    message: string;
  }>;
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
    locationType: 'shelves',
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
    warehouseCode: 'OUT-001',
    warehouseName: 'Outlet 1',
    locationCode: 'IS-01-01-01',
    zone: 'IS',
    aisle: '01',
    levelCode: '01',
    bin: '01',
    locationType: 'island',
    status: 'blocked',
    palletCapacity: 2,
    usedPalletCapacity: 1,
    cubicCapacityM3: 5,
    usedCubicCapacityM3: 2,
    isActive: true,
    notes: 'Outlet display island',
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

function normalizeStatus(value: string): WarehouseLocationStatus {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'empty' || normalized === 'occupied' || normalized === 'blocked') {
    return normalized;
  }

  throw new Error('status must be one of: empty, occupied, blocked');
}

function normalizeType(value: string): WarehouseLocationType {
  const normalized = value.trim().toLowerCase();

  if (
    normalized === 'rack' ||
    normalized === 'floor' ||
    normalized === 'bulk' ||
    normalized === 'staging' ||
    normalized === 'quarantine' ||
    normalized === 'shelves' ||
    normalized === 'island'
  ) {
    return normalized;
  }

  throw new Error('locationType must be one of: rack, floor, bulk, staging, quarantine, shelves, island');
}

function toNumber(value: string, field: string, min = 0) {
  const parsed = Number(value);

  if (Number.isNaN(parsed) || parsed < min) {
    throw new Error(`${field} must be a valid number ${min} or greater`);
  }

  return parsed;
}

function toBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'active';
}

function splitCsvLine(line: string) {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((item) => item.trim());
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
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

export function exportWarehouseLocationsCsv() {
  const header = [
    'warehouseCode',
    'warehouseName',
    'locationCode',
    'zone',
    'aisle',
    'levelCode',
    'bin',
    'locationType',
    'status',
    'palletCapacity',
    'usedPalletCapacity',
    'cubicCapacityM3',
    'usedCubicCapacityM3',
    'isActive',
    'notes'
  ].join(',');

  const rows = warehouseLocationStore.map((item) =>
    [
      csvEscape(item.warehouseCode),
      csvEscape(item.warehouseName),
      csvEscape(item.locationCode),
      csvEscape(item.zone),
      csvEscape(item.aisle),
      csvEscape(item.levelCode),
      csvEscape(item.bin),
      csvEscape(item.locationType),
      csvEscape(item.status),
      csvEscape(item.palletCapacity),
      csvEscape(item.usedPalletCapacity),
      csvEscape(item.cubicCapacityM3),
      csvEscape(item.usedCubicCapacityM3),
      csvEscape(item.isActive),
      csvEscape(item.notes)
    ].join(',')
  );

  return [header, ...rows].join('\n');
}

export function importWarehouseLocationsCsv(csvText: string): WarehouseLocationImportResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row');
  }

  const header = splitCsvLine(lines[0]);
  const expectedHeader = [
    'warehouseCode',
    'warehouseName',
    'locationCode',
    'zone',
    'aisle',
    'levelCode',
    'bin',
    'locationType',
    'status',
    'palletCapacity',
    'usedPalletCapacity',
    'cubicCapacityM3',
    'usedCubicCapacityM3',
    'isActive',
    'notes'
  ];

  const headerMatches =
    header.length === expectedHeader.length &&
    header.every((value, index) => value === expectedHeader[index]);

  if (!headerMatches) {
    throw new Error(`CSV header must be exactly: ${expectedHeader.join(',')}`);
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ rowNumber: number; message: string }> = [];

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i + 1;

    try {
      const cols = splitCsvLine(lines[i]);

      if (cols.length !== expectedHeader.length) {
        throw new Error('Column count does not match header');
      }

      const [
        warehouseCode,
        warehouseName,
        locationCode,
        zone,
        aisle,
        levelCode,
        bin,
        locationType,
        status,
        palletCapacity,
        usedPalletCapacity,
        cubicCapacityM3,
        usedCubicCapacityM3,
        isActive,
        notes
      ] = cols;

      if (!warehouseCode || !warehouseName || !locationCode || !zone || !aisle || !levelCode || !bin) {
        throw new Error('Required text fields are missing');
      }

      const normalizedType = normalizeType(locationType);
      const normalizedStatus = normalizeStatus(status);

      const payload: CreateWarehouseLocationInput = {
        warehouseCode,
        warehouseName,
        locationCode,
        zone,
        aisle,
        levelCode,
        bin,
        locationType: normalizedType,
        status: normalizedStatus,
        palletCapacity: toNumber(palletCapacity, 'palletCapacity', 0),
        usedPalletCapacity: toNumber(usedPalletCapacity, 'usedPalletCapacity', 0),
        cubicCapacityM3: toNumber(cubicCapacityM3, 'cubicCapacityM3', 0),
        usedCubicCapacityM3: toNumber(usedCubicCapacityM3, 'usedCubicCapacityM3', 0),
        isActive: toBoolean(isActive),
        notes
      };

      const existingIndex = warehouseLocationStore.findIndex(
        (item) => item.locationCode.toLowerCase() === locationCode.toLowerCase()
      );

      if (existingIndex >= 0) {
        const existing = warehouseLocationStore[existingIndex];
        warehouseLocationStore[existingIndex] = {
          ...existing,
          ...payload,
          id: existing.id,
          updatedAt: new Date().toISOString()
        };
        updated += 1;
      } else {
        const record: WarehouseLocationRecord = {
          id: 'loc-' + Date.now() + '-' + rowNumber,
          ...payload,
          updatedAt: new Date().toISOString()
        };
        warehouseLocationStore = [record, ...warehouseLocationStore];
        inserted += 1;
      }
    } catch (error: any) {
      skipped += 1;
      errors.push({
        rowNumber,
        message: error?.message || 'Unknown import error'
      });
    }
  }

  return {
    inserted,
    updated,
    skipped,
    errors
  };
}