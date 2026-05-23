import { listInventory } from '../inventory/repository';
import { listBatches } from '../batches/repository';

export type StockAlertType =
  | 'low_stock'
  | 'out_of_stock'
  | 'overstock'
  | 'expiring_soon'
  | 'expired_batch';

export type StockAlertSeverity = 'high' | 'medium' | 'low';

export interface StockControlSummary {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  overstockItems: number;
  expiringSoonBatches: number;
  expiredBatches: number;
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

function daysBetween(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
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

  return {
    totalItems: inventory.length,
    lowStockItems,
    outOfStockItems,
    overstockItems,
    expiringSoonBatches,
    expiredBatches
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