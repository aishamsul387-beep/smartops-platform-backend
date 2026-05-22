export type UomType = 'quantity' | 'weight' | 'volume' | 'length' | 'pack';
export type UomRoundingRule = 'none' | 'round_up' | 'round_down' | 'round_nearest';

export interface UomRecord {
  id: string;
  uomCode: string;
  uomName: string;
  uomType: UomType;
  decimalPlaces: number;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface UomConversionGroupRecord {
  id: string;
  groupCode: string;
  groupName: string;
  description: string;
  isActive: boolean;
}

export interface UomConversionLineRecord {
  id: string;
  conversionGroupId: string;
  fromUomCode: string;
  toUomCode: string;
  multiplier: number;
  isBase: boolean;
  roundingRule: UomRoundingRule;
  isActive: boolean;
}

export interface CreateUomInput {
  uomCode: string;
  uomName: string;
  uomType: UomType;
  decimalPlaces: number;
  notes: string;
}

export interface UpdateUomInput {
  id: string;
  uomCode: string;
  uomName: string;
  uomType: UomType;
  decimalPlaces: number;
  notes: string;
}

export interface CreateConversionGroupInput {
  groupCode: string;
  groupName: string;
  description: string;
}

export interface UpdateConversionGroupInput {
  id: string;
  groupCode: string;
  groupName: string;
  description: string;
}

export interface CreateConversionLineInput {
  conversionGroupId: string;
  fromUomCode: string;
  toUomCode: string;
  multiplier: number;
  isBase: boolean;
  roundingRule: UomRoundingRule;
}

export interface UpdateConversionLineInput extends CreateConversionLineInput {
  id: string;
}

let uomStore: UomRecord[] = [
  {
    id: 'uom-001',
    uomCode: 'PCS',
    uomName: 'Pieces',
    uomType: 'quantity',
    decimalPlaces: 0,
    isActive: true,
    notes: 'Base each/piece unit',
    createdAt: '2026-05-22T08:00:00.000Z',
    updatedAt: '2026-05-22T08:00:00.000Z'
  },
  {
    id: 'uom-002',
    uomCode: 'BOX',
    uomName: 'Box',
    uomType: 'pack',
    decimalPlaces: 0,
    isActive: true,
    notes: 'Packed inner box',
    createdAt: '2026-05-22T08:00:00.000Z',
    updatedAt: '2026-05-22T08:00:00.000Z'
  },
  {
    id: 'uom-003',
    uomCode: 'CTN',
    uomName: 'Carton',
    uomType: 'pack',
    decimalPlaces: 0,
    isActive: true,
    notes: 'Outer carton',
    createdAt: '2026-05-22T08:00:00.000Z',
    updatedAt: '2026-05-22T08:00:00.000Z'
  },
  {
    id: 'uom-004',
    uomCode: 'KG',
    uomName: 'Kilogram',
    uomType: 'weight',
    decimalPlaces: 3,
    isActive: true,
    notes: 'Standard weight unit',
    createdAt: '2026-05-22T08:00:00.000Z',
    updatedAt: '2026-05-22T08:00:00.000Z'
  },
  {
    id: 'uom-005',
    uomCode: 'G',
    uomName: 'Gram',
    uomType: 'weight',
    decimalPlaces: 0,
    isActive: true,
    notes: 'Sub-weight unit',
    createdAt: '2026-05-22T08:00:00.000Z',
    updatedAt: '2026-05-22T08:00:00.000Z'
  }
];

let conversionGroupStore: UomConversionGroupRecord[] = [
  {
    id: 'cg-001',
    groupCode: 'PK_STD_001',
    groupName: 'Standard Packaging 24x12',
    description: '1 BOX = 24 PCS and 1 CTN = 12 BOX',
    isActive: true
  },
  {
    id: 'cg-002',
    groupCode: 'WT_STD_001',
    groupName: 'Weight Conversion',
    description: '1 KG = 1000 G',
    isActive: true
  }
];

let conversionLineStore: UomConversionLineRecord[] = [
  {
    id: 'cl-001',
    conversionGroupId: 'cg-001',
    fromUomCode: 'BOX',
    toUomCode: 'PCS',
    multiplier: 24,
    isBase: false,
    roundingRule: 'none',
    isActive: true
  },
  {
    id: 'cl-002',
    conversionGroupId: 'cg-001',
    fromUomCode: 'CTN',
    toUomCode: 'BOX',
    multiplier: 12,
    isBase: false,
    roundingRule: 'none',
    isActive: true
  },
  {
    id: 'cl-003',
    conversionGroupId: 'cg-001',
    fromUomCode: 'CTN',
    toUomCode: 'PCS',
    multiplier: 288,
    isBase: false,
    roundingRule: 'none',
    isActive: true
  },
  {
    id: 'cl-004',
    conversionGroupId: 'cg-002',
    fromUomCode: 'KG',
    toUomCode: 'G',
    multiplier: 1000,
    isBase: false,
    roundingRule: 'none',
    isActive: true
  }
];

function matchesSearch(values: string[], search?: string) {
  const normalized = String(search ?? '').trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(normalized));
}

export function listUoms(filters?: { search?: string; type?: string }) {
  return uomStore.filter((item) => {
    const okSearch = matchesSearch(
      [item.uomCode, item.uomName, item.uomType, item.notes],
      filters?.search
    );

    const type = String(filters?.type ?? '').trim();
    const okType = !type || type === 'all' || item.uomType === type;

    return okSearch && okType;
  });
}

export function getUomById(id: string) {
  return uomStore.find((item) => item.id === id) ?? null;
}

export function createUom(input: CreateUomInput) {
  const record: UomRecord = {
    id: 'uom-' + Date.now(),
    uomCode: input.uomCode,
    uomName: input.uomName,
    uomType: input.uomType,
    decimalPlaces: input.decimalPlaces,
    isActive: true,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  uomStore.unshift(record);
  return record;
}

export function updateUom(input: UpdateUomInput) {
  const current = uomStore.find((item) => item.id === input.id);

  if (!current) {
    return null;
  }

  const updated: UomRecord = {
    ...current,
    uomCode: input.uomCode,
    uomName: input.uomName,
    uomType: input.uomType,
    decimalPlaces: input.decimalPlaces,
    notes: input.notes,
    updatedAt: new Date().toISOString()
  };

  const index = uomStore.findIndex((item) => item.id === input.id);
  uomStore[index] = updated;

  return updated;
}

export function setUomActiveStatus(id: string, isActive: boolean) {
  const current = uomStore.find((item) => item.id === id);

  if (!current) {
    return null;
  }

  const updated: UomRecord = {
    ...current,
    isActive,
    updatedAt: new Date().toISOString()
  };

  const index = uomStore.findIndex((item) => item.id === id);
  uomStore[index] = updated;

  return updated;
}

export function listConversionGroups(filters?: { search?: string }) {
  return conversionGroupStore.filter((item) =>
    matchesSearch([item.groupCode, item.groupName, item.description], filters?.search)
  );
}

export function getConversionGroupById(id: string) {
  return conversionGroupStore.find((item) => item.id === id) ?? null;
}

export function createConversionGroup(input: CreateConversionGroupInput) {
  const record: UomConversionGroupRecord = {
    id: 'cg-' + Date.now(),
    groupCode: input.groupCode,
    groupName: input.groupName,
    description: input.description,
    isActive: true
  };

  conversionGroupStore.unshift(record);
  return record;
}

export function updateConversionGroup(input: UpdateConversionGroupInput) {
  const current = conversionGroupStore.find((item) => item.id === input.id);

  if (!current) {
    return null;
  }

  const updated: UomConversionGroupRecord = {
    ...current,
    groupCode: input.groupCode,
    groupName: input.groupName,
    description: input.description
  };

  const index = conversionGroupStore.findIndex((item) => item.id === input.id);
  conversionGroupStore[index] = updated;

  return updated;
}

export function setConversionGroupActiveStatus(id: string, isActive: boolean) {
  const current = conversionGroupStore.find((item) => item.id === id);

  if (!current) {
    return null;
  }

  const updated: UomConversionGroupRecord = {
    ...current,
    isActive
  };

  const index = conversionGroupStore.findIndex((item) => item.id === id);
  conversionGroupStore[index] = updated;

  return updated;
}

export function listConversionLinesByGroupId(groupId: string) {
  return conversionLineStore.filter((item) => item.conversionGroupId === groupId);
}

export function createConversionLine(input: CreateConversionLineInput) {
  const record: UomConversionLineRecord = {
    id: 'cl-' + Date.now(),
    conversionGroupId: input.conversionGroupId,
    fromUomCode: input.fromUomCode,
    toUomCode: input.toUomCode,
    multiplier: input.multiplier,
    isBase: input.isBase,
    roundingRule: input.roundingRule,
    isActive: true
  };

  conversionLineStore.unshift(record);
  return record;
}

export function updateConversionLine(input: UpdateConversionLineInput) {
  const current = conversionLineStore.find((item) => item.id === input.id);

  if (!current) {
    return null;
  }

  const updated: UomConversionLineRecord = {
    ...current,
    conversionGroupId: input.conversionGroupId,
    fromUomCode: input.fromUomCode,
    toUomCode: input.toUomCode,
    multiplier: input.multiplier,
    isBase: input.isBase,
    roundingRule: input.roundingRule
  };

  const index = conversionLineStore.findIndex((item) => item.id === input.id);
  conversionLineStore[index] = updated;

  return updated;
}

export function setConversionLineActiveStatus(id: string, isActive: boolean) {
  const current = conversionLineStore.find((item) => item.id === id);

  if (!current) {
    return null;
  }

  const updated: UomConversionLineRecord = {
    ...current,
    isActive
  };

  const index = conversionLineStore.findIndex((item) => item.id === id);
  conversionLineStore[index] = updated;

  return updated;
}

export function getConversionLineById(id: string) {
  return conversionLineStore.find((item) => item.id === id) ?? null;
}