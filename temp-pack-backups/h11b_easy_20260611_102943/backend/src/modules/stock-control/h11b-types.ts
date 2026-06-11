export type H11BReasonCode =
  | 'PRODUCTION_USE'
  | 'INTERNAL_USE'
  | 'DAMAGE'
  | 'QUALITY_REJECT'
  | 'SAMPLE'
  | 'EXPIRY_DISPOSAL'
  | 'MANUAL_CONSUMPTION';

export interface H11BReasonOption {
  code: H11BReasonCode;
  label: string;
  active: boolean;
}

export interface H11BWarehouseOption {
  code: string;
  name: string;
  active: boolean;
}

export interface H11BLocationOption {
  code: string;
  name: string;
  warehouseCode: string;
  active: boolean;
}

export interface H11BContextResponse {
  reasonCodes: H11BReasonOption[];
  warehouses: H11BWarehouseOption[];
  locations: H11BLocationOption[];
}

export interface H11BPreviewRequest {
  inventoryItemId: string;
  productName: string;
  sku?: string | null;
  barcode?: string | null;
  requestedQty: number;
  reasonCode: H11BReasonCode;
  warehouseCode?: string | null;
  locationCode?: string | null;
  remarks?: string | null;
}

export interface H11BAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: string | null;
  allocatedQty: number;
  availableQty: number;
}

export interface H11BPreviewResponse {
  canFulfill: boolean;
  requestedQty: number;
  totalAllocatableQty: number;
  shortageQty: number;
  allocations: H11BAllocation[];
  validation: string[];
}

export interface H11BIssueRecord {
  id: string;
  issueNumber: string;
  status: 'POSTED';
  inventoryItemId: string;
  productName: string;
  sku?: string | null;
  barcode?: string | null;
  requestedQty: number;
  issuedQty: number;
  reasonCode: H11BReasonCode;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  locationCode?: string | null;
  locationName?: string | null;
  remarks?: string | null;
  actorName?: string | null;
  createdAt: string;
  updatedAt: string;
  allocations: H11BAllocation[];
  movementRefs: string[];
}

export interface H11BIssueListResponse {
  items: H11BIssueRecord[];
  total: number;
}
