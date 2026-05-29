import { Router } from 'express'
import { created, ok } from '../../common/http/api-response'
import { asyncHandler } from '../../common/utils/async-handler'
import { AppError } from '../../common/errors/app-error'
import {
  createBatch,
  getBatchById,
  getBatchPersistenceMode,
  listBatches,
  type BatchStatus
} from './repository'

export const batchesRouter = Router()

type MutableBatchRecord = {
  id: string
  batchStatus: BatchStatus
  receivedQty: number
  availableQty: number
  reservedQty: number
  blockedQty: number
  qaHoldQty: number
  updatedAt?: string
  notes?: string
}

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value ?? ''
}

const allowedStatuses: BatchStatus[] = [
  'available',
  'blocked',
  'quarantine',
  'expired',
  'consumed'
]

function optionalText(value: unknown, max = 120) {
  const text = String(value ?? '').trim()

  if (!text) {
    return ''
  }

  if (text.length > max) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `Text length must be ${max} characters or less`
    })
  }

  return text
}

function requiredText(value: unknown, field: string, min = 1, max = 120) {
  const text = String(value ?? '').trim()

  if (!text) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${field} is required`
    })
  }

  if (text.length < min || text.length > max) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${field} must be between ${min} and ${max} characters`
    })
  }

  return text
}

function optionalNumber(value: unknown, field: string, min = 0) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 0
  }

  const parsed = Number(value)

  if (Number.isNaN(parsed) || parsed < min) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${field} must be a valid number ${min} or greater`
    })
  }

  return parsed
}

function optionalDateText(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

function toNonNegativeNumber(value: unknown) {
  const parsed = Number(value)
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0
  }

  return parsed
}

function resolveTrackedQty(item: MutableBatchRecord) {
  const bucketTotal =
    toNonNegativeNumber(item.availableQty) +
    toNonNegativeNumber(item.reservedQty) +
    toNonNegativeNumber(item.blockedQty) +
    toNonNegativeNumber(item.qaHoldQty)

  const receivedQty = toNonNegativeNumber(item.receivedQty)

  return bucketTotal > 0 ? bucketTotal : receivedQty
}

function buildQtyStateForStatus(totalQty: number, batchStatus: BatchStatus) {
  switch (batchStatus) {
    case 'available':
      return {
        availableQty: totalQty,
        reservedQty: 0,
        blockedQty: 0,
        qaHoldQty: 0
      }

    case 'blocked':
      return {
        availableQty: 0,
        reservedQty: 0,
        blockedQty: totalQty,
        qaHoldQty: 0
      }

    case 'quarantine':
      return {
        availableQty: 0,
        reservedQty: 0,
        blockedQty: 0,
        qaHoldQty: totalQty
      }

    case 'expired':
      return {
        availableQty: 0,
        reservedQty: 0,
        blockedQty: totalQty,
        qaHoldQty: 0
      }

    case 'consumed':
      return {
        availableQty: 0,
        reservedQty: 0,
        blockedQty: 0,
        qaHoldQty: 0
      }

    default:
      return {
        availableQty: totalQty,
        reservedQty: 0,
        blockedQty: 0,
        qaHoldQty: 0
      }
  }
}

function mergeStatusNote(
  existing: unknown,
  batchStatus: BatchStatus,
  statusNote: string,
  changedAt: string
) {
  const actionLine = statusNote
    ? `Status updated to ${batchStatus} on ${changedAt}: ${statusNote}`
    : `Status updated to ${batchStatus} on ${changedAt}`

  const current = String(existing ?? '').trim()
  if (!current) {
    return actionLine
  }

  const merged = `${current}\n${actionLine}`.trim()
  return merged.length <= 1000 ? merged : merged.slice(0, 1000)
}

function applyBatchStatusAction(
  item: MutableBatchRecord,
  batchStatus: BatchStatus,
  statusNote: string
) {
  const changedAt = new Date().toISOString()
  const totalQty = resolveTrackedQty(item)
  const nextQtyState = buildQtyStateForStatus(totalQty, batchStatus)

  item.batchStatus = batchStatus
  item.availableQty = nextQtyState.availableQty
  item.reservedQty = nextQtyState.reservedQty
  item.blockedQty = nextQtyState.blockedQty
  item.qaHoldQty = nextQtyState.qaHoldQty
  item.updatedAt = changedAt

  if (statusNote) {
    item.notes = mergeStatusNote(item.notes, batchStatus, statusNote, changedAt)
  }

  return item
}

batchesRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const items = await listBatches({
      inventoryItemId: readSingle(request.query.inventoryItemId as string | string[] | undefined),
      status: readSingle(request.query.status as string | string[] | undefined),
      search: readSingle(request.query.search as string | string[] | undefined)
    })

    return ok(
      response,
      {
        items,
        total: items.length,
        persistenceMode: getBatchPersistenceMode()
      },
      200
    )
  })
)

batchesRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined)
    const item = await getBatchById(id)

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'BATCH_NOT_FOUND',
        message: 'Batch not found'
      })
    }

    return ok(response, item, 200)
  })
)

batchesRouter.patch(
  '/:id/status',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined)
    const batchStatus = String(request.body?.batchStatus ?? '').trim() as BatchStatus
    const statusNote = optionalText(request.body?.statusNote, 180)

    if (!allowedStatuses.includes(batchStatus)) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'batchStatus must be one of: available, blocked, quarantine, expired, consumed'
      })
    }

    const item = (await getBatchById(id)) as MutableBatchRecord | null

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'BATCH_NOT_FOUND',
        message: 'Batch not found'
      })
    }

    const updatedItem = applyBatchStatusAction(item, batchStatus, statusNote)

    return ok(response, updatedItem, 200)
  })
)

batchesRouter.post(
  '/',
  asyncHandler(async (request, response) => {
    const batchStatus = String(request.body?.batchStatus ?? '').trim() as BatchStatus

    if (!allowedStatuses.includes(batchStatus)) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'batchStatus must be one of: available, blocked, quarantine, expired, consumed'
      })
    }

    const item = await createBatch({
      inventoryItemId: requiredText(request.body?.inventoryItemId, 'inventoryItemId', 3, 100),
      batchNumber: requiredText(request.body?.batchNumber, 'batchNumber', 2, 80),
      lotNumber: optionalText(request.body?.lotNumber, 80),
      supplierLotNumber: optionalText(request.body?.supplierLotNumber, 80),
      manufactureDate: optionalDateText(request.body?.manufactureDate),
      expiryDate: optionalDateText(request.body?.expiryDate),
      receivedDate: optionalDateText(request.body?.receivedDate),
      supplierName: optionalText(request.body?.supplierName, 120),
      purchaseOrderNo: optionalText(request.body?.purchaseOrderNo, 80),
      goodsReceivedNoteNo: optionalText(request.body?.goodsReceivedNoteNo, 80),
      unitCost: optionalNumber(request.body?.unitCost, 'unitCost', 0),
      currency: optionalText(request.body?.currency, 10),
      receivedQty: optionalNumber(request.body?.receivedQty, 'receivedQty', 0),
      availableQty: optionalNumber(request.body?.availableQty, 'availableQty', 0),
      reservedQty: optionalNumber(request.body?.reservedQty, 'reservedQty', 0),
      blockedQty: optionalNumber(request.body?.blockedQty, 'blockedQty', 0),
      qaHoldQty: optionalNumber(request.body?.qaHoldQty, 'qaHoldQty', 0),
      batchStatus,
      warehouseLocation: optionalText(request.body?.warehouseLocation, 50),
      zone: optionalText(request.body?.zone, 20),
      aisle: optionalText(request.body?.aisle, 20),
      levelCode: optionalText(request.body?.levelCode, 20),
      bin: optionalText(request.body?.bin, 20),
      notes: optionalText(request.body?.notes, 250)
    })

    return created(response, item)
  })
)
