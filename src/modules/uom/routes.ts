import { Router } from 'express';
import { created, ok } from '../../common/http/api-response';
import { asyncHandler } from '../../common/utils/async-handler';
import { AppError } from '../../common/errors/app-error';
import {
  createConversionGroup,
  createConversionLine,
  createUom,
  getConversionGroupById,
  getConversionLineById,
  getUomById,
  listConversionGroups,
  listConversionLinesByGroupId,
  listUoms,
  setConversionGroupActiveStatus,
  setConversionLineActiveStatus,
  setUomActiveStatus,
  type UomRoundingRule,
  type UomType,
  updateConversionGroup,
  updateConversionLine,
  updateUom
} from './store';

export const uomRouter = Router();

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

const allowedTypes: UomType[] = ['quantity', 'weight', 'volume', 'length', 'pack'];
const allowedRoundingRules: UomRoundingRule[] = [
  'none',
  'round_up',
  'round_down',
  'round_nearest'
];

function normalizeDecimalPlaces(value: unknown) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'decimalPlaces must be a whole number between 0 and 6'
    });
  }

  return parsed;
}

function normalizeMultiplier(value: unknown) {
  const parsed = Number(value);

  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'multiplier must be a valid number greater than 0'
    });
  }

  return parsed;
}

function normalizeType(value: unknown) {
  const type = String(value ?? '').trim() as UomType;

  if (!allowedTypes.includes(type)) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'uomType must be one of: quantity, weight, volume, length, pack'
    });
  }

  return type;
}

function normalizeRoundingRule(value: unknown) {
  const rule = String(value ?? '').trim() as UomRoundingRule;

  if (!allowedRoundingRules.includes(rule)) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'roundingRule must be one of: none, round_up, round_down, round_nearest'
    });
  }

  return rule;
}

function normalizeRequiredString(value: unknown, field: string, min = 1, max = 100) {
  const text = String(value ?? '').trim();

  if (!text) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${field} is required`
    });
  }

  if (text.length < min || text.length > max) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${field} must be between ${min} and ${max} characters`
    });
  }

  return text;
}

uomRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const items = listUoms({
      search: readSingle(request.query.search as string | string[] | undefined),
      type: readSingle(request.query.type as string | string[] | undefined)
    });

    return ok(response, items, 200);
  })
);

uomRouter.post(
  '/',
  asyncHandler(async (request, response) => {
    const uomCode = normalizeRequiredString(request.body?.uomCode, 'uomCode', 1, 20).toUpperCase();
    const uomName = normalizeRequiredString(request.body?.uomName, 'uomName', 2, 100);
    const uomType = normalizeType(request.body?.uomType);
    const decimalPlaces = normalizeDecimalPlaces(request.body?.decimalPlaces);
    const notes = String(request.body?.notes ?? '').trim();

    const existing = listUoms().find((item) => item.uomCode.toUpperCase() === uomCode);
    if (existing) {
      throw new AppError({
        status: 400,
        code: 'UOM_CODE_EXISTS',
        message: 'A UOM with this code already exists'
      });
    }

    const item = createUom({
      uomCode,
      uomName,
      uomType,
      decimalPlaces,
      notes
    });

    return created(response, item);
  })
);

uomRouter.put(
  '/:id',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);

    if (!getUomById(id)) {
      throw new AppError({
        status: 404,
        code: 'UOM_NOT_FOUND',
        message: 'UOM not found'
      });
    }

    const uomCode = normalizeRequiredString(request.body?.uomCode, 'uomCode', 1, 20).toUpperCase();
    const uomName = normalizeRequiredString(request.body?.uomName, 'uomName', 2, 100);
    const uomType = normalizeType(request.body?.uomType);
    const decimalPlaces = normalizeDecimalPlaces(request.body?.decimalPlaces);
    const notes = String(request.body?.notes ?? '').trim();

    const duplicate = listUoms().find(
      (item) => item.id !== id && item.uomCode.toUpperCase() === uomCode
    );

    if (duplicate) {
      throw new AppError({
        status: 400,
        code: 'UOM_CODE_EXISTS',
        message: 'Another UOM with this code already exists'
      });
    }

    const item = updateUom({
      id,
      uomCode,
      uomName,
      uomType,
      decimalPlaces,
      notes
    });

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'UOM_NOT_FOUND',
        message: 'UOM not found'
      });
    }

    return ok(response, item, 200);
  })
);

uomRouter.patch(
  '/:id/active',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);
    const isActive = Boolean(request.body?.isActive);

    const item = setUomActiveStatus(id, isActive);

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'UOM_NOT_FOUND',
        message: 'UOM not found'
      });
    }

    return ok(response, item, 200);
  })
);

uomRouter.get(
  '/conversion-groups',
  asyncHandler(async (request, response) => {
    const items = listConversionGroups({
      search: readSingle(request.query.search as string | string[] | undefined)
    });

    return ok(response, items, 200);
  })
);

uomRouter.post(
  '/conversion-groups',
  asyncHandler(async (request, response) => {
    const groupCode = normalizeRequiredString(request.body?.groupCode, 'groupCode', 1, 30).toUpperCase();
    const groupName = normalizeRequiredString(request.body?.groupName, 'groupName', 2, 120);
    const description = String(request.body?.description ?? '').trim();

    const duplicate = listConversionGroups().find((item) => item.groupCode.toUpperCase() === groupCode);
    if (duplicate) {
      throw new AppError({
        status: 400,
        code: 'CONVERSION_GROUP_CODE_EXISTS',
        message: 'A conversion group with this code already exists'
      });
    }

    const item = createConversionGroup({
      groupCode,
      groupName,
      description
    });

    return created(response, item);
  })
);

uomRouter.put(
  '/conversion-groups/:id',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);

    if (!getConversionGroupById(id)) {
      throw new AppError({
        status: 404,
        code: 'UOM_CONVERSION_GROUP_NOT_FOUND',
        message: 'UOM conversion group not found'
      });
    }

    const groupCode = normalizeRequiredString(request.body?.groupCode, 'groupCode', 1, 30).toUpperCase();
    const groupName = normalizeRequiredString(request.body?.groupName, 'groupName', 2, 120);
    const description = String(request.body?.description ?? '').trim();

    const duplicate = listConversionGroups().find(
      (item) => item.id !== id && item.groupCode.toUpperCase() === groupCode
    );

    if (duplicate) {
      throw new AppError({
        status: 400,
        code: 'CONVERSION_GROUP_CODE_EXISTS',
        message: 'Another conversion group with this code already exists'
      });
    }

    const item = updateConversionGroup({
      id,
      groupCode,
      groupName,
      description
    });

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'UOM_CONVERSION_GROUP_NOT_FOUND',
        message: 'UOM conversion group not found'
      });
    }

    return ok(response, item, 200);
  })
);

uomRouter.patch(
  '/conversion-groups/:id/active',
  asyncHandler(async (request, response) => {
    const id = readSingle(request.params.id as string | string[] | undefined);
    const isActive = Boolean(request.body?.isActive);

    const item = setConversionGroupActiveStatus(id, isActive);

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'UOM_CONVERSION_GROUP_NOT_FOUND',
        message: 'UOM conversion group not found'
      });
    }

    return ok(response, item, 200);
  })
);

uomRouter.get(
  '/conversion-groups/:id/lines',
  asyncHandler(async (request, response) => {
    const groupId = readSingle(request.params.id as string | string[] | undefined);
    const group = getConversionGroupById(groupId);

    if (!group) {
      throw new AppError({
        status: 404,
        code: 'UOM_CONVERSION_GROUP_NOT_FOUND',
        message: 'UOM conversion group not found'
      });
    }

    const lines = listConversionLinesByGroupId(groupId);

    return ok(
      response,
      {
        group,
        lines
      },
      200
    );
  })
);

uomRouter.post(
  '/conversion-groups/:id/lines',
  asyncHandler(async (request, response) => {
    const conversionGroupId = readSingle(request.params.id as string | string[] | undefined);
    const group = getConversionGroupById(conversionGroupId);

    if (!group) {
      throw new AppError({
        status: 404,
        code: 'UOM_CONVERSION_GROUP_NOT_FOUND',
        message: 'UOM conversion group not found'
      });
    }

    const fromUomCode = normalizeRequiredString(request.body?.fromUomCode, 'fromUomCode', 1, 20).toUpperCase();
    const toUomCode = normalizeRequiredString(request.body?.toUomCode, 'toUomCode', 1, 20).toUpperCase();
    const multiplier = normalizeMultiplier(request.body?.multiplier);
    const isBase = Boolean(request.body?.isBase);
    const roundingRule = normalizeRoundingRule(request.body?.roundingRule);

    const item = createConversionLine({
      conversionGroupId,
      fromUomCode,
      toUomCode,
      multiplier,
      isBase,
      roundingRule
    });

    return created(response, item);
  })
);

uomRouter.put(
  '/conversion-groups/:groupId/lines/:lineId',
  asyncHandler(async (request, response) => {
    const conversionGroupId = readSingle(request.params.groupId as string | string[] | undefined);
    const lineId = readSingle(request.params.lineId as string | string[] | undefined);

    const group = getConversionGroupById(conversionGroupId);
    if (!group) {
      throw new AppError({
        status: 404,
        code: 'UOM_CONVERSION_GROUP_NOT_FOUND',
        message: 'UOM conversion group not found'
      });
    }

    const existing = getConversionLineById(lineId);
    if (!existing) {
      throw new AppError({
        status: 404,
        code: 'UOM_CONVERSION_LINE_NOT_FOUND',
        message: 'UOM conversion line not found'
      });
    }

    const fromUomCode = normalizeRequiredString(request.body?.fromUomCode, 'fromUomCode', 1, 20).toUpperCase();
    const toUomCode = normalizeRequiredString(request.body?.toUomCode, 'toUomCode', 1, 20).toUpperCase();
    const multiplier = normalizeMultiplier(request.body?.multiplier);
    const isBase = Boolean(request.body?.isBase);
    const roundingRule = normalizeRoundingRule(request.body?.roundingRule);

    const item = updateConversionLine({
      id: lineId,
      conversionGroupId,
      fromUomCode,
      toUomCode,
      multiplier,
      isBase,
      roundingRule
    });

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'UOM_CONVERSION_LINE_NOT_FOUND',
        message: 'UOM conversion line not found'
      });
    }

    return ok(response, item, 200);
  })
);

uomRouter.patch(
  '/conversion-groups/:groupId/lines/:lineId/active',
  asyncHandler(async (request, response) => {
    const lineId = readSingle(request.params.lineId as string | string[] | undefined);
    const isActive = Boolean(request.body?.isActive);

    const item = setConversionLineActiveStatus(lineId, isActive);

    if (!item) {
      throw new AppError({
        status: 404,
        code: 'UOM_CONVERSION_LINE_NOT_FOUND',
        message: 'UOM conversion line not found'
      });
    }

    return ok(response, item, 200);
  })
);