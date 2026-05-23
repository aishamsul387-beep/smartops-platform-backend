import { listInventory } from '../inventory/repository';
import { listBatches } from '../batches/repository';

export type StockAlertType =
  | 'low_stock'
  | 'out_of_stock'
  | 'overstock'
  | 'expiring_soon'
  | 'expired_batch';

export type StockAlertSeverity = 'high' | 'medium' | 'low';
export type ReorderPriority = 'critical' | 'high' | 'medium' | 'low';

export interface StockControlSummary {
  totalItems: number;
  totalOnHandQty: number;
  lowStockItems: number;
  outOfStockItems: number;
  overstockItems: number;
  expiringSoonBatches: number;
  expiredBatches: number;
  reorderCandidates: number;
  criticalReorderCount: number;
  highReorderCount: number;
  mediumReorderCount: number;
}

export interface StockControlAlert {
  id: string;
  alertType: StockAlertType;
  severity: StockAlertSeverity;
  referenceType: 'inventory' | 'batch';
  referenceId: string;
  title: string;
  message: string;
  itemCode?: string;
  batchNumber?: string;
  dueDate?: string | null;
}

export interface ReorderSuggestion {
  id: string;
  inventoryItemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  currentQty: number;
  reorderLevel: number;
  minimumStockLevel: number;
  maximumStockLevel: number;
  suggestedOrderQty: number;
  estimatedDailyUsage: number;
  estimatedDaysOfCover: number;
  priority: ReorderPriority;
  reason: string;
  preferredSupplierName: string;
  leadTimeDays: number;
  reorderByDate: string;
  riskNote: string;
}

function daysBetween(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function estimateDailyUsage(quantity: number, reorderLevel: number, minimumStockLevel: number) {
  const baseline = Math.max(reorderLevel, minimumStockLevel, 1);
  const estimate = baseline / 30;
  return Number(estimate.toFixed(2));
}

function estimateDaysOfCover(quantity: number, dailyUsage: number) {
  if (dailyUsage <= 0) {
    return 999;
  }

  return Math.floor(quantity / dailyUsage);
}

function decidePriority(
  quantity: number,
  reorderLevel: number,
  minimumStockLevel: number
): ReorderPriority {
  if (quantity <= 0) {
    return 'critical';
  }

  if (quantity <= minimumStockLevel) {
    return 'high';
  }

  if (quantity <= reorderLevel) {
    return 'medium';
  }

  return 'low';
}

function calculateSuggestedOrderQty(
  quantity: number,
  reorderLevel: number,
  minimumStockLevel: number,
  maximumStockLevel: number
) {
  const targetLevel = Math.max(maximumStockLevel, reorderLevel + minimumStockLevel, reorderLevel);
  const suggestion = Math.max(targetLevel - quantity, 0);
  return Math.ceil(suggestion);
}

function getLeadTimeDays(category: string) {
  const normalized = category.trim().toLowerCase();

  if (normalized.includes('raw')) {
    return 14;
  }

  if (normalized.includes('pack')) {
    return 7;
  }

  if (normalized.includes('finished')) {
    return 10;
  }

  return 12;
}

function getPreferredSupplierName(inventoryItemId: string, fallback = 'Unassigned supplier') {
  return fallbackMap[inventoryItemId] || fallback;
}

let fallbackMap: Record<string, string> = {};

function buildSupplierFallbackMap(batchSupplierPairs: { inventoryItemId: string; supplierName: string; updatedAt: string }[]) {
  const sorted = [...batchSupplierPairs].sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const map: Record<string, string> = {};

  for (const item of sorted) {
    if (!map[item.inventoryItemId] && item.supplierName.trim()) {
      map[item.inventoryItemId] = item.supplierName.trim();
    }
  }

  fallbackMap = map;
}

function buildRiskNote(priority: ReorderPriority, daysOfCover: number, leadTimeDays: number) {
  if (priority === 'critical') {
    return 'Immediate shortage risk. Procurement action required now.';
  }

  if (priority === 'high') {
    return 'Stock is below minimum level and may not cover expected demand safely.';
  }

  if (daysOfCover < leadTimeDays) {
    return 'Projected cover is below lead time. Order should be placed early.';
  }

  return 'Monitor and replenish within normal planning cycle.';
}

function formatReorderByDate(daysUntilOrder: number) {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(daysUntilOrder, 0));
  return date.toISOString().slice(0, 10);
}

export async function getStockControlSummary(): Promise<StockControlSummary> {
  const inventory = await listInventory({ status: 'all', search: '' });
  const batches = await listBatches({ status: 'all', search: '' });

  const now = new Date();

  const lowStockItems = inventory.filter(
    (item) => item.quantity > 0 && item.quantity <= item.minimumStockLevel
  ).length;

  const outOfStockItems = inventory.filter((item) => item.quantity <= 0).length;

  const overstockItems = inventory.filter(
    (item) => item.maximumStockLevel > 0 && item.quantity > item.maximumStockLevel
  ).length;

  const expiringSoonBatches = batches.filter((batch) => {
    if (!batch.expiryDate) {
      return false;
    }

    const expiry = new Date(batch.expiryDate);
    const days = daysBetween(now, expiry);

    return days >= 0 && days <= 30;
  }).length;

  const expiredBatches = batches.filter((batch) => {
    if (!batch.expiryDate) {
      return false;
    }

    const expiry = new Date(batch.expiryDate);
    return expiry.getTime() < now.getTime();
  }).length;

  const reorderCandidates = inventory.filter(
    (item) => item.quantity <= item.reorderLevel
  ).length;

  const totalOnHandQty = inventory.reduce((sum, item) => sum + item.quantity, 0);

  const reorderSuggestions = inventory
    .filter((item) => item.isActive && item.quantity <= item.reorderLevel)
    .map((item) => decidePriority(item.quantity, item.reorderLevel, item.minimumStockLevel));

  const criticalReorderCount = reorderSuggestions.filter((p) => p === 'critical').length;
  const highReorderCount = reorderSuggestions.filter((p) => p === 'high').length;
  const mediumReorderCount = reorderSuggestions.filter((p) => p === 'medium').length;

  return {
    totalItems: inventory.length,
    totalOnHandQty,
    lowStockItems,
    outOfStockItems,
    overstockItems,
    expiringSoonBatches,
    expiredBatches,
    reorderCandidates,
    criticalReorderCount,
    highReorderCount,
    mediumReorderCount
  };
}

export async function getStockControlAlerts(): Promise<StockControlAlert[]> {
  const inventory = await listInventory({ status: 'all', search: '' });
  const batches = await listBatches({ status: 'all', search: '' });

  const now = new Date();
  const alerts: StockControlAlert[] = [];

  for (const item of inventory) {
    if (item.quantity <= 0) {
      alerts.push({
        id: `alert-out-${item.id}`,
        alertType: 'out_of_stock',
        severity: 'high',
        referenceType: 'inventory',
        referenceId: item.id,
        title: `${item.name} is out of stock`,
        message: `Current quantity is ${item.quantity}. Immediate replenishment should be reviewed.`,
        itemCode: item.sku
      });
      continue;
    }

    if (item.quantity <= item.minimumStockLevel) {
      alerts.push({
        id: `alert-low-${item.id}`,
        alertType: 'low_stock',
        severity: 'medium',
        referenceType: 'inventory',
        referenceId: item.id,
        title: `${item.name} is below minimum stock`,
        message: `Current quantity ${item.quantity} is at or below minimum stock level ${item.minimumStockLevel}.`,
        itemCode: item.sku
      });
    }

    if (item.maximumStockLevel > 0 && item.quantity > item.maximumStockLevel) {
      alerts.push({
        id: `alert-over-${item.id}`,
        alertType: 'overstock',
        severity: 'low',
        referenceType: 'inventory',
        referenceId: item.id,
        title: `${item.name} is above maximum stock`,
        message: `Current quantity ${item.quantity} exceeds maximum stock level ${item.maximumStockLevel}.`,
        itemCode: item.sku
      });
    }
  }

  for (const batch of batches) {
    if (!batch.expiryDate) {
      continue;
    }

    const expiry = new Date(batch.expiryDate);
    const days = daysBetween(now, expiry);

    if (expiry.getTime() < now.getTime()) {
      alerts.push({
        id: `alert-expired-${batch.id}`,
        alertType: 'expired_batch',
        severity: 'high',
        referenceType: 'batch',
        referenceId: batch.id,
        title: `Batch ${batch.batchNumber} has expired`,
        message: `This batch expired on ${batch.expiryDate}. Immediate blocking/review is recommended.`,
        batchNumber: batch.batchNumber,
        dueDate: batch.expiryDate,
        itemCode: batch.inventoryItemId
      });
      continue;
    }

    if (days <= 30) {
      alerts.push({
        id: `alert-expiring-${batch.id}`,
        alertType: 'expiring_soon',
        severity: days <= 7 ? 'high' : 'medium',
        referenceType: 'batch',
        referenceId: batch.id,
        title: `Batch ${batch.batchNumber} is expiring soon`,
        message: `This batch will expire in ${days} day(s). Review FEFO issuance or disposal planning.`,
        batchNumber: batch.batchNumber,
        dueDate: batch.expiryDate,
        itemCode: batch.inventoryItemId
      });
    }
  }

  return alerts.sort((a, b) => {
    const score = (value: StockAlertSeverity) =>
      value === 'high' ? 3 : value === 'medium' ? 2 : 1;

    return score(b.severity) - score(a.severity);
  });
}

export async function getReorderSuggestions(): Promise<ReorderSuggestion[]> {
  const inventory = await listInventory({ status: 'all', search: '' });
  const batches = await listBatches({ status: 'all', search: '' });

  buildSupplierFallbackMap(
    batches.map((batch) => ({
      inventoryItemId: batch.inventoryItemId,
      supplierName: batch.supplierName,
      updatedAt: batch.updatedAt
    }))
  );

  const suggestions = inventory
    .filter((item) => item.isActive && item.quantity <= item.reorderLevel)
    .map((item) => {
      const dailyUsage = estimateDailyUsage(
        item.quantity,
        item.reorderLevel,
        item.minimumStockLevel
      );

      const daysOfCover = estimateDaysOfCover(item.quantity, dailyUsage);
      const suggestedOrderQty = calculateSuggestedOrderQty(
        item.quantity,
        item.reorderLevel,
        item.minimumStockLevel,
        item.maximumStockLevel
      );

      const priority = decidePriority(
        item.quantity,
        item.reorderLevel,
        item.minimumStockLevel
      );

      const leadTimeDays = getLeadTimeDays(item.category);
      const reorderByDate = formatReorderByDate(daysOfCover - leadTimeDays);
      const preferredSupplierName = getPreferredSupplierName(item.id);
      const riskNote = buildRiskNote(priority, daysOfCover, leadTimeDays);

      let reason = 'Reorder threshold reached.';

      if (item.quantity <= 0) {
        reason = 'Out of stock and requires urgent replenishment.';
      } else if (item.quantity <= item.minimumStockLevel) {
        reason = 'Below minimum stock level and should be replenished soon.';
      } else if (item.quantity <= item.reorderLevel) {
        reason = 'At or below reorder level based on planning rule.';
      }

      return {
        id: `reorder-${item.id}`,
        inventoryItemId: item.id,
        itemCode: item.sku,
        itemName: item.name,
        category: item.category,
        currentQty: item.quantity,
        reorderLevel: item.reorderLevel,
        minimumStockLevel: item.minimumStockLevel,
        maximumStockLevel: item.maximumStockLevel,
        suggestedOrderQty,
        estimatedDailyUsage: dailyUsage,
        estimatedDaysOfCover: daysOfCover,
        priority,
        reason,
        preferredSupplierName,
        leadTimeDays,
        reorderByDate,
        riskNote
      };
    });

  const priorityScore = (value: ReorderPriority) =>
    value === 'critical' ? 4 :
    value === 'high' ? 3 :
    value === 'medium' ? 2 : 1;

  return suggestions.sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority));
}