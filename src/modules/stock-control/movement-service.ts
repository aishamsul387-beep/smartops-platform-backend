import { listBatches } from '../batches/repository'
import { listInventory } from '../inventory/repository'

export type StockMovementType = 'receipt'
export type StockMovementReferenceType = 'grn' | 'po' | 'batch'

export interface StockMovementRecord {
  id: string
  movementType: StockMovementType
  inventoryItemId: string
  itemCode: string
  barcode: string
  itemName: string
  batchId: string
  batchNumber: string
  lotNumber: string
  supplierLotNumber: string
  supplierName: string
  qtyIn: number
  qtyOut: number
  netQty: number
  availableQty: number
  reservedQty: number
  blockedQty: number
  qaHoldQty: number
  unitCost: number
  currency: string
  batchStatus: string
  purchaseOrderNo: string
  goodsReceivedNoteNo: string
  referenceType: StockMovementReferenceType
  referenceNo: string
  warehouseLocation: string
  zone: string
  aisle: string
  levelCode: string
  bin: string
  manufactureDate: string | null
  expiryDate: string | null
  receivedDate: string | null
  occurredAt: string
  notes: string
}

function sortByOccurredAtDesc(items: StockMovementRecord[]) {
  return [...items].sort((a, b) => {
    return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  })
}

function toNonNegativeNumber(value: unknown) {
  const parsed = Number(value)
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0
  }

  return parsed
}

function resolveCurrentNetQty(batch: {
  receivedQty: number
  availableQty: number
  reservedQty: number
  blockedQty: number
  qaHoldQty: number
}) {
  const bucketTotal =
    toNonNegativeNumber(batch.availableQty) +
    toNonNegativeNumber(batch.reservedQty) +
    toNonNegativeNumber(batch.blockedQty) +
    toNonNegativeNumber(batch.qaHoldQty)

  return bucketTotal > 0 ? bucketTotal : toNonNegativeNumber(batch.receivedQty)
}

export async function getStockMovements(): Promise<StockMovementRecord[]> {
  const [inventoryRows, batchRows] = await Promise.all([
    listInventory({ search: '', status: 'all' }),
    listBatches({ search: '', status: 'all' })
  ])

  const inventoryMap = inventoryRows.reduce<Record<string, (typeof inventoryRows)[number]>>(
    (acc, item) => {
      acc[item.id] = item
      return acc
    },
    {}
  )

  const movements = batchRows.map((batch) => {
    const inventory = inventoryMap[batch.inventoryItemId]

    const referenceType: StockMovementReferenceType = batch.goodsReceivedNoteNo
      ? 'grn'
      : batch.purchaseOrderNo
        ? 'po'
        : 'batch'

    const referenceNo = batch.goodsReceivedNoteNo || batch.purchaseOrderNo || batch.batchNumber

    return {
      id: `mov-${batch.id}`,
      movementType: 'receipt' as StockMovementType,
      inventoryItemId: batch.inventoryItemId,
      itemCode: inventory?.sku || '',
      barcode: inventory?.barcode || '',
      itemName: inventory?.name || '',
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      lotNumber: batch.lotNumber,
      supplierLotNumber: batch.supplierLotNumber,
      supplierName: batch.supplierName,
      qtyIn: toNonNegativeNumber(batch.receivedQty || 0),
      qtyOut: 0,
      netQty: resolveCurrentNetQty(batch),
      availableQty: toNonNegativeNumber(batch.availableQty || 0),
      reservedQty: toNonNegativeNumber(batch.reservedQty || 0),
      blockedQty: toNonNegativeNumber(batch.blockedQty || 0),
      qaHoldQty: toNonNegativeNumber(batch.qaHoldQty || 0),
      unitCost: toNonNegativeNumber(batch.unitCost || 0),
      currency: batch.currency || 'USD',
      batchStatus: batch.batchStatus,
      purchaseOrderNo: batch.purchaseOrderNo || '',
      goodsReceivedNoteNo: batch.goodsReceivedNoteNo || '',
      referenceType,
      referenceNo,
      warehouseLocation: batch.warehouseLocation || '',
      zone: batch.zone || '',
      aisle: batch.aisle || '',
      levelCode: batch.levelCode || '',
      bin: batch.bin || '',
      manufactureDate: batch.manufactureDate || null,
      expiryDate: batch.expiryDate || null,
      receivedDate: batch.receivedDate || null,
      occurredAt: batch.updatedAt || batch.receivedDate || new Date().toISOString(),
      notes: batch.notes || ''
    }
  })

  return sortByOccurredAtDesc(movements)
}

export async function getInventoryStockMovements(inventoryItemId: string) {
  const items = await getStockMovements()
  return items.filter((item) => item.inventoryItemId === inventoryItemId)
}

export async function getBatchStockMovements(batchId: string) {
  const items = await getStockMovements()
  return items.filter((item) => item.batchId === batchId)
}
