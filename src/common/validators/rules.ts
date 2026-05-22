import { AppError } from '../errors/app-error';

export function requireTrimmedString(
  value: unknown,
  fieldName: string,
  options?: {
    minLength?: number;
    maxLength?: number;
    allowEmpty?: boolean;
  }
) {
  const normalized = String(value ?? '').trim();

  if (!options?.allowEmpty && !normalized) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${fieldName} is required`
    });
  }

  if (normalized && options?.minLength && normalized.length < options.minLength) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${fieldName} must be at least ${options.minLength} characters`
    });
  }

  if (normalized && options?.maxLength && normalized.length > options.maxLength) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${fieldName} must be ${options.maxLength} characters or less`
    });
  }

  return normalized;
}

export function optionalTrimmedString(
  value: unknown,
  fieldName: string,
  options?: {
    maxLength?: number;
  }
) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return '';
  }

  if (options?.maxLength && normalized.length > options.maxLength) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${fieldName} must be ${options.maxLength} characters or less`
    });
  }

  return normalized;
}

export function requirePositiveInteger(value: unknown, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${fieldName} must be a whole number greater than 0`
    });
  }

  return parsed;
}

export function requireNonNegativeNumber(value: unknown, fieldName: string) {
  const parsed = Number(value);

  if (Number.isNaN(parsed) || parsed < 0) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${fieldName} must be a valid number 0 or greater`
    });
  }

  return parsed;
}

export function requireEnumValue<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): T {
  const normalized = String(value ?? '').trim() as T;

  if (!allowedValues.includes(normalized)) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${fieldName} must be one of: ${allowedValues.join(', ')}`
    });
  }

  return normalized;
}