import {
  H11BAllocation,
  H11BContextResponse,
  H11BIssueListResponse,
  H11BIssueRecord,
  H11BLocationOption,
  H11BPreviewRequest,
  H11BPreviewResponse,
  H11BReasonOption,
  H11BWarehouseOption,
} from './h11b-types';
import {
  createH11BIssueRepo,
  getH11BIssueByIdRepo,
  listH11BIssuesRepo,
} from './h11b-issue-repository';

const reasonCodes: H11BReasonOption[] = [
  { code: 'PRODUCTION_USE', label: 'Production Use', active: true },
  { code: 'INTERNAL_USE', label: 'Internal Use', active: true },
  { code: 'DAMAGE', label: 'Damage', active: true },
  { code: 'QUALITY_REJECT', label: 'Quality Reject', active: true },
  { code: 'SAMPLE', label: 'Sample', active: true },
  { code: 'EXPIRY_DISPOSAL', label: 'Expiry Disposal', active: true },
  { code: 'MANUAL_CONSUMPTION', label: 'Manual Consumption', active: true },
];

const warehouses: H11BWarehouseOption[] = [
  { code: 'MAIN', name: 'Main Warehouse', active: true },
  { code: 'KITCHEN', name: 'Kitchen Store', active: true },
];

const locations: H11BLocationOption[] = [
  { code: 'A1', name: 'A1 Rack', warehouseCode: 'MAIN', active: true },
  { code: 'A2', name: 'A2 Rack', warehouseCode: 'MAIN', active: true },
  { code: 'K1', name: 'Kitchen Cold Room', warehouseCode: 'KITCHEN', active: true },
];

function buildMockAllocations(requestedQty: number): H11BAllocation[] {
  const sources = [
    {
      batchId: 'batch-h11b-001',
      batchNumber: 'B-20260610-001',
      expiryDate: '2026-06-10',
      availableQty: 5,
    },
    {
      batchId: 'batch-h11b-002',
      batchNumber: 'B-20260620-002',
      expiryDate: '2026-06-20',
      availableQty: 10,
    },
    {
      batchId: 'batch-h11b-003',
      batchNumber: 'B-20260715-003',
      expiryDate: '2026-07-15',
      availableQty: 20,
    },
  ];

  let remaining = Number(requestedQty || 0);
  const allocations: H11BAllocation[] = [];

  for (const source of sources) {
    if (remaining <= 0) break;
    const allocatedQty = Math.min(source.availableQty, remaining);
    if (allocatedQty > 0) {
      allocations.push({
        batchId: source.batchId,
        batchNumber: source.batchNumber,
        expiryDate: source.expiryDate,
        allocatedQty,
        availableQty: source.availableQty,
      });
      remaining -= allocatedQty;
    }
  }

  return allocations;
}

export function getH11BContext(): H11BContextResponse {
  return {
    reasonCodes,
    warehouses,
    locations,
  };
}

export function previewH11BIssueService(payload: H11BPreviewRequest): H11BPreviewResponse {
  const validation: string[] = [];

  if (!payload.inventoryItemId?.trim()) validation.push('Inventory Item ID is required');
  if (!payload.productName?.trim()) validation.push('Product Name is required');
  if (!payload.requestedQty || Number(payload.requestedQty) <= 0) validation.push('Requested Qty must be greater than 0');
  if (!payload.reasonCode) validation.push('Reason Code is required');
  if (!payload.warehouseCode) validation.push('Warehouse is required');
  if (!payload.locationCode) validation.push('Location is required');

  const allocations = buildMockAllocations(Number(payload.requestedQty || 0));
  const totalAllocatableQty = allocations.reduce((sum, item) => sum + item.allocatedQty, 0);
  const shortageQty = Math.max(0, Number(payload.requestedQty || 0) - totalAllocatableQty);

  if (shortageQty > 0) {
    validation.push(`Insufficient stock for full issue. Shortage: ${shortageQty}`);
  }

  return {
    canFulfill: validation.length === 0 || (validation.length === 1 && validation[0].startsWith('Insufficient stock') === false),
    requestedQty: Number(payload.requestedQty || 0),
    totalAllocatableQty,
    shortageQty,
    allocations,
    validation,
  };
}

export function createH11BIssueService(payload: H11BPreviewRequest): H11BIssueRecord {
  const preview = previewH11BIssueService(payload);

  if (preview.validation.length > 0) {
    throw new Error(preview.validation[0]);
  }

  if (!preview.canFulfill || preview.shortageQty > 0) {
    throw new Error(`Insufficient stock. Shortage: ${preview.shortageQty}`);
  }

  const all = listH11BIssuesRepo();
  const nextSequence = String(all.length + 1).padStart(4, '0');
  const today = new Date();
  const datePart = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('');

  const warehouseName =
    warehouses.find((item) => item.code === payload.warehouseCode)?.name || payload.warehouseCode || null;

  const locationName =
    locations.find((item) => item.code === payload.locationCode)?.name || payload.locationCode || null;

  const nowIso = new Date().toISOString();
  const issue: H11BIssueRecord = {
    id: `h11b-${Date.now()}`,
    issueNumber: `SI-H11B-${datePart}-${nextSequence}`,
    status: 'POSTED',
    inventoryItemId: payload.inventoryItemId,
    productName: payload.productName,
    sku: payload.sku || null,
    barcode: payload.barcode || null,
    requestedQty: Number(payload.requestedQty),
    issuedQty: Number(payload.requestedQty),
    reasonCode: payload.reasonCode,
    warehouseCode: payload.warehouseCode || null,
    warehouseName,
    locationCode: payload.locationCode || null,
    locationName,
    remarks: payload.remarks || null,
    actorName: 'System Admin',
    createdAt: nowIso,
    updatedAt: nowIso,
    allocations: preview.allocations,
    movementRefs: preview.allocations.map((item, index) => `MV-H11B-${datePart}-${String(index + 1).padStart(3, '0')}`),
  };

  return createH11BIssueRepo(issue);
}

export function listH11BIssuesService(q = ''): H11BIssueListResponse {
  const all = listH11BIssuesRepo();
  const keyword = q.trim().toLowerCase();

  if (!keyword) {
    return {
      items: all,
      total: all.length,
    };
  }

  const filtered = all.filter((item) => {
    const haystack = [
      item.issueNumber,
      item.productName,
      item.sku || '',
      item.barcode || '',
      item.reasonCode,
      item.warehouseName || '',
      item.locationName || '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(keyword);
  });

  return {
    items: filtered,
    total: filtered.length,
  };
}

export function getH11BIssueDetailService(issueId: string): H11BIssueRecord | null {
  return getH11BIssueByIdRepo(issueId);
}
