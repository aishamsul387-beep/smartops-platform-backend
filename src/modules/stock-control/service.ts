import { listInventory } from '../inventory/repository';
import { listBatches } from '../batches/repository';
import { createPurchaseOrder } from '../orders/store';

export type StockAlertType =
  | 'low_stock'
  | 'out_of_stock'
  | 'overstock'
  | 'expiring_soon'
  | 'expired_batch';

export type StockAlertSeverity = 'high' | 'medium' | 'low';
export type ReorderPriority = 'critical' | 'high' | 'medium' | 'low';
export type DemandTrend = 'rising' | 'stable' | 'falling';
export type ProcurementAction = 'order_now' | 'order_this_week' | 'monitor';
export type ProcurementQueueStatus = 'immediate' | 'this_week' | 'monitor';
export type SupplierSource = 'inventory_master' | 'batch_history' | 'unassigned';

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
  risingDemandItems: number;
  stableDemandItems: number;
  fallingDemandItems: number;
  procurementDueToday: number;
  procurementDueThisWeek: number;
  plannedProcurementValue: number;
  urgentProcurementValue: number;
  planningCurrency: string;
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
  itemType: string;
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
  supplierSource: SupplierSource;
  supplierScore: number;
  leadTimeDays: number;
  reorderByDate: string;
  riskNote: string;
  demandTrend: DemandTrend;
  monthlyUsageEstimate: number;
  forecastDemand30d: number;
  forecastDemand60d: number;
  forecastDemand90d: number;
  procurementAction: ProcurementAction;
  standardCost: number;
  currency: string;
  estimatedReorderValue: number;
}

export interface ProcurementQueueItem {
  id: string;
  inventoryItemId: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  preferredSupplierName: string;
  supplierSource: SupplierSource;
  suggestedOrderQty: number;
  reorderByDate: string;
  leadTimeDays: number;
  priority: ReorderPriority;
  supplierScore: number;
  procurementAction: ProcurementAction;
  queueStatus: ProcurementQueueStatus;
  riskNote: string;
  standardCost: number;
  currency: string;
  estimatedOrderValue: number;
}

export interface DraftPurchaseOrderResult {
  purchaseOrder: {
    id: string;
    poNo: string;
    supplierName: string;
    itemCount: number;
    totalAmount: number;
    currency: string;
    status: string;
    expectedDate: string;
    createdAt: string;
  };
  sourceSuggestion: {
    inventoryItemId: string;
    itemCode: string;
    itemName: string;
    suggestedOrderQty: number;
    estimatedReorderValue: number;
    preferredSupplierName: string;
    supplierSource: SupplierSource;
    standardCost: number;
    currency: string;
    reorderByDate: string;
  };
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

function getLeadTimeDays(itemType: string, category: string) {
  const normalizedType = itemType.trim().toLowerCase();
  const normalizedCategory = category.trim().toLowerCase();

  if (normalizedType === 'raw_material' || normalizedCategory.includes('raw')) {
    return 14;
  }

  if (normalizedType === 'packaging' || normalizedCategory.includes('pack')) {
    return 7;
  }

  if (normalizedType === 'finished_goods' || normalizedCategory.includes('finished')) {
    return 10;
  }

  if (normalizedType === 'spare_part') {
    return 9;
  }

  return 12;
}

function decideDemandTrend(item: {
  quantity: number;
  reorderLevel: number;
  minimumStockLevel: number;
  maximumStockLevel: number;
  category: string;
  itemType: string;
}): DemandTrend {
  const category = item.category.trim().toLowerCase();
  const itemType = item.itemType.trim().toLowerCase();

  if (
    item.quantity <= item.minimumStockLevel ||
    category.includes('raw') ||
    itemType === 'raw_material'
  ) {
    return 'rising';
  }

  if (
    (item.maximumStockLevel > 0 && item.quantity > item.maximumStockLevel) ||
    category.includes('finished') ||
    itemType === 'finished_goods'
  ) {
    return 'falling';
  }

  return 'stable';
}

function forecastMultiplier(trend: DemandTrend) {
  if (trend === 'rising') return 1.2;
  if (trend === 'falling') return 0.8;
  return 1;
}

function estimateForecastDemand(days: number, monthlyUsage: number, trend: DemandTrend) {
  const base = monthlyUsage * (days / 30);
  return Math.ceil(base * forecastMultiplier(trend));
}

function getSupplierScore(preferredSupplierName: string, supplierSource: SupplierSource) {
  if (supplierSource === 'unassigned' || !preferredSupplierName) {
    return 45;
  }

  const normalized = preferredSupplierName.toLowerCase();

  if (normalized.includes('prime')) {
    return 92;
  }

  if (normalized.includes('pack')) {
    return 84;
  }

  if (normalized.includes('valve')) {
    return 78;
  }

  if (supplierSource === 'inventory_master') {
    return 75;
  }

  return 70;
}

let fallbackMap: Record<string, string> = {};

function buildSupplierFallbackMap(
  batchSupplierPairs: { inventoryItemId: string; supplierName: string; updatedAt: string }[]
) {
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

function getPreferredSupplierProfile(item: {
  id: string;
  preferredSupplierName?: string;
}) {
  const fromInventoryMaster = String(item.preferredSupplierName ?? '').trim();

  if (fromInventoryMaster) {
    return {
      preferredSupplierName: fromInventoryMaster,
      supplierSource: 'inventory_master' as SupplierSource
    };
  }

  const fromBatchHistory = String(fallbackMap[item.id] ?? '').trim();

  if (fromBatchHistory) {
    return {
      preferredSupplierName: fromBatchHistory,
      supplierSource: 'batch_history' as SupplierSource
    };
  }

  return {
    preferredSupplierName: 'Unassigned supplier',
    supplierSource: 'unassigned' as SupplierSource
  };
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

function buildProcurementAction(
  priority: ReorderPriority,
  daysOfCover: number,
  leadTimeDays: number
): ProcurementAction {
  if (priority === 'critical') {
    return 'order_now';
  }

  if (priority === 'high' || daysOfCover < leadTimeDays) {
    return 'order_this_week';
  }

  return 'monitor';
}

function formatReorderByDate(daysUntilOrder: number) {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(daysUntilOrder, 0));
  return date.toISOString().slice(0, 10);
}

function daysUntil(dateText: string) {
  const now = new Date();
  const target = new Date(dateText);
  return daysBetween(now, target);
}

function buildQueueStatus(reorderByDate: string): ProcurementQueueStatus {
  const days = daysUntil(reorderByDate);

  if (days <= 0) {
    return 'immediate';
  }

  if (days <= 7) {
    return 'this_week';
  }

  return 'monitor';
}

function getPlanningCurrency(
  inventory: Array<{ currency?: string }>,
  suggestions: Array<{ currency: string }>
) {
  const firstInventoryCurrency = inventory.find((item) => String(item.currency ?? '').trim())?.currency;
  const firstSuggestionCurrency = suggestions.find((item) => String(item.currency ?? '').trim())?.currency;

  return String(firstInventoryCurrency ?? firstSuggestionCurrency ?? 'USD').trim().toUpperCase() || 'USD';
}

function toExpectedDateIso(dateText: string) {
  const parsed = new Date(`${dateText}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
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

      const demandTrend = decideDemandTrend({
        quantity: item.quantity,
        reorderLevel: item.reorderLevel,
        minimumStockLevel: item.minimumStockLevel,
        maximumStockLevel: item.maximumStockLevel,
        category: item.category,
        itemType: String(item.itemType ?? '')
      });

      const monthlyUsageEstimate = Math.ceil(dailyUsage * 30 * forecastMultiplier(demandTrend));
      const forecastDemand30d = estimateForecastDemand(30, monthlyUsageEstimate, demandTrend);
      const forecastDemand60d = estimateForecastDemand(60, monthlyUsageEstimate, demandTrend);
      const forecastDemand90d = estimateForecastDemand(90, monthlyUsageEstimate, demandTrend);

      const leadTimeDays = getLeadTimeDays(String(item.itemType ?? ''), item.category);
      const reorderByDate = formatReorderByDate(daysOfCover - leadTimeDays);

      const supplierProfile = getPreferredSupplierProfile({
        id: item.id,
        preferredSupplierName: item.preferredSupplierName
      });

      const supplierScore = getSupplierScore(
        supplierProfile.preferredSupplierName,
        supplierProfile.supplierSource
      );

      const riskNote = buildRiskNote(priority, daysOfCover, leadTimeDays);
      const procurementAction = buildProcurementAction(priority, daysOfCover, leadTimeDays);

      let reason = 'Reorder threshold reached.';

      if (item.quantity <= 0) {
        reason = 'Out of stock and requires urgent replenishment.';
      } else if (item.quantity <= item.minimumStockLevel) {
        reason = 'Below minimum stock level and should be replenished soon.';
      } else if (item.quantity <= item.reorderLevel) {
        reason = 'At or below reorder level based on planning rule.';
      }

      const standardCost = Number(item.standardCost ?? 0);
      const currency = String(item.currency ?? 'USD').trim().toUpperCase() || 'USD';
      const estimatedReorderValue = Number((suggestedOrderQty * standardCost).toFixed(2));

      return {
        id: `reorder-${item.id}`,
        inventoryItemId: item.id,
        itemCode: item.sku,
        itemName: item.name,
        category: item.category,
        itemType: String(item.itemType ?? ''),
        currentQty: item.quantity,
        reorderLevel: item.reorderLevel,
        minimumStockLevel: item.minimumStockLevel,
        maximumStockLevel: item.maximumStockLevel,
        suggestedOrderQty,
        estimatedDailyUsage: dailyUsage,
        estimatedDaysOfCover: daysOfCover,
        priority,
        reason,
        preferredSupplierName: supplierProfile.preferredSupplierName,
        supplierSource: supplierProfile.supplierSource,
        supplierScore,
        leadTimeDays,
        reorderByDate,
        riskNote,
        demandTrend,
        monthlyUsageEstimate,
        forecastDemand30d,
        forecastDemand60d,
        forecastDemand90d,
        procurementAction,
        standardCost,
        currency,
        estimatedReorderValue
      };
    });

  const priorityScore = (value: ReorderPriority) =>
    value === 'critical' ? 4 :
    value === 'high' ? 3 :
    value === 'medium' ? 2 : 1;

  return suggestions.sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority));
}

export async function getProcurementActionQueue(): Promise<ProcurementQueueItem[]> {
  const suggestions = await getReorderSuggestions();

  return suggestions.map((item) => ({
    id: `queue-${item.inventoryItemId}`,
    inventoryItemId: item.inventoryItemId,
    itemCode: item.itemCode,
    itemName: item.itemName,
    itemType: item.itemType,
    preferredSupplierName: item.preferredSupplierName,
    supplierSource: item.supplierSource,
    suggestedOrderQty: item.suggestedOrderQty,
    reorderByDate: item.reorderByDate,
    leadTimeDays: item.leadTimeDays,
    priority: item.priority,
    supplierScore: item.supplierScore,
    procurementAction: item.procurementAction,
    queueStatus: buildQueueStatus(item.reorderByDate),
    riskNote: item.riskNote,
    standardCost: item.standardCost,
    currency: item.currency,
    estimatedOrderValue: item.estimatedReorderValue
  }));
}

export async function createDraftPurchaseOrderFromSuggestion(
  inventoryItemId: string
): Promise<DraftPurchaseOrderResult | null> {
  const suggestions = await getReorderSuggestions();
  const suggestion = suggestions.find((item) => item.inventoryItemId === inventoryItemId);

  if (!suggestion) {
    return null;
  }

  const supplierName =
    suggestion.preferredSupplierName && suggestion.preferredSupplierName !== 'Unassigned supplier'
      ? suggestion.preferredSupplierName
      : 'Pending supplier assignment';

  const purchaseOrder = createPurchaseOrder({
    supplierName,
    itemCount: 1,
    totalAmount: suggestion.estimatedReorderValue,
    currency: suggestion.currency,
    expectedDate: toExpectedDateIso(suggestion.reorderByDate),
    status: 'draft'
  });

  return {
    purchaseOrder: {
      id: purchaseOrder.id,
      poNo: purchaseOrder.poNo,
      supplierName: purchaseOrder.supplierName,
      itemCount: purchaseOrder.itemCount,
      totalAmount: purchaseOrder.totalAmount,
      currency: purchaseOrder.currency,
      status: purchaseOrder.status,
      expectedDate: purchaseOrder.expectedDate,
      createdAt: purchaseOrder.createdAt
    },
    sourceSuggestion: {
      inventoryItemId: suggestion.inventoryItemId,
      itemCode: suggestion.itemCode,
      itemName: suggestion.itemName,
      suggestedOrderQty: suggestion.suggestedOrderQty,
      estimatedReorderValue: suggestion.estimatedReorderValue,
      preferredSupplierName: suggestion.preferredSupplierName,
      supplierSource: suggestion.supplierSource,
      standardCost: suggestion.standardCost,
      currency: suggestion.currency,
      reorderByDate: suggestion.reorderByDate
    }
  };
}

export async function getStockControlSummary(): Promise<StockControlSummary> {
  const inventory = await listInventory({ status: 'all', search: '' });
  const batches = await listBatches({ status: 'all', search: '' });
  const reorderSuggestions = await getReorderSuggestions();

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

  const reorderCandidates = reorderSuggestions.length;
  const totalOnHandQty = inventory.reduce((sum, item) => sum + item.quantity, 0);

  const criticalReorderCount = reorderSuggestions.filter((p) => p.priority === 'critical').length;
  const highReorderCount = reorderSuggestions.filter((p) => p.priority === 'high').length;
  const mediumReorderCount = reorderSuggestions.filter((p) => p.priority === 'medium').length;

  const risingDemandItems = reorderSuggestions.filter((p) => p.demandTrend === 'rising').length;
  const stableDemandItems = reorderSuggestions.filter((p) => p.demandTrend === 'stable').length;
  const fallingDemandItems = reorderSuggestions.filter((p) => p.demandTrend === 'falling').length;

  const procurementQueue = await getProcurementActionQueue();
  const procurementDueToday = procurementQueue.filter((q) => q.queueStatus === 'immediate').length;
  const procurementDueThisWeek = procurementQueue.filter((q) => q.queueStatus === 'this_week').length;

  const plannedProcurementValue = Number(
    reorderSuggestions.reduce((sum, item) => sum + item.estimatedReorderValue, 0).toFixed(2)
  );

  const urgentProcurementValue = Number(
    procurementQueue
      .filter((item) => item.queueStatus === 'immediate' || item.queueStatus === 'this_week')
      .reduce((sum, item) => sum + item.estimatedOrderValue, 0)
      .toFixed(2)
  );

  const planningCurrency = getPlanningCurrency(inventory, reorderSuggestions);

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
    mediumReorderCount,
    risingDemandItems,
    stableDemandItems,
    fallingDemandItems,
    procurementDueToday,
    procurementDueThisWeek,
    plannedProcurementValue,
    urgentProcurementValue,
    planningCurrency
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