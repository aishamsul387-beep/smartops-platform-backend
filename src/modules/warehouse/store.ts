export type WarehouseLocationStatus = 'available' | 'limited' | 'full';

export interface WarehouseLocationRecord {
  id: string;
  code: string;
  zone: string;
  aisle: string;
  bin: string;
  capacity: number;
  occupied: number;
  itemCount: number;
  status: WarehouseLocationStatus;
  updatedAt: string;
}

export interface WarehouseSummaryRecord {
  totalLocations: number;
  activeLocations: number;
  fullLocations: number;
  totalCapacity: number;
  totalOccupied: number;
  utilizationPercent: number;
}

let warehouseLocations: WarehouseLocationRecord[] = [
  {
    id: 'wh-001',
    code: 'A-01-01',
    zone: 'A',
    aisle: '01',
    bin: '01',
    capacity: 300,
    occupied: 240,
    itemCount: 12,
    status: 'available',
    updatedAt: '2026-05-21T08:30:00.000Z'
  },
  {
    id: 'wh-002',
    code: 'B-02-04',
    zone: 'B',
    aisle: '02',
    bin: '04',
    capacity: 120,
    occupied: 95,
    itemCount: 7,
    status: 'limited',
    updatedAt: '2026-05-21T09:00:00.000Z'
  },
  {
    id: 'wh-003',
    code: 'C-03-02',
    zone: 'C',
    aisle: '03',
    bin: '02',
    capacity: 80,
    occupied: 80,
    itemCount: 3,
    status: 'full',
    updatedAt: '2026-05-21T09:40:00.000Z'
  },
  {
    id: 'wh-004',
    code: 'D-01-05',
    zone: 'D',
    aisle: '01',
    bin: '05',
    capacity: 200,
    occupied: 60,
    itemCount: 5,
    status: 'available',
    updatedAt: '2026-05-21T10:10:00.000Z'
  }
];

function matchesSearch(values: string[], search?: string) {
  const normalized = String(search ?? '').trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(normalized));
}

export function listWarehouseLocations(filters?: { search?: string; status?: string }) {
  return warehouseLocations.filter((item) => {
    const okSearch = matchesSearch(
      [item.code, item.zone, item.aisle, item.bin],
      filters?.search
    );

    const status = String(filters?.status ?? '').trim();
    const okStatus = !status || status === 'all' || item.status === status;

    return okSearch && okStatus;
  });
}

export function getWarehouseSummary(): WarehouseSummaryRecord {
  const totalLocations = warehouseLocations.length;
  const activeLocations = warehouseLocations.filter((item) => item.occupied > 0).length;
  const fullLocations = warehouseLocations.filter((item) => item.status === 'full').length;
  const totalCapacity = warehouseLocations.reduce((sum, item) => sum + item.capacity, 0);
  const totalOccupied = warehouseLocations.reduce((sum, item) => sum + item.occupied, 0);

  return {
    totalLocations,
    activeLocations,
    fullLocations,
    totalCapacity,
    totalOccupied,
    utilizationPercent: totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0
  };
}
