import { Router, Request, Response } from 'express';

interface H11BIssuePreviewInput {
  inventoryItemId: string;
  requestedQty: number;
  reason?: string;
}

interface H11BIssueRecord {
  id: string;
  issueNo: string;
  inventoryItemId: string;
  requestedQty: number;
  issuedQty: number;
  reason: string;
  createdAt: string;
}

const h11bIssueStore: H11BIssueRecord[] = [];

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function buildIssueNo() {
  return `H11B-ISS-${String(h11bIssueStore.length + 1).padStart(3, '0')}`;
}

function getH11BContext() {
  return {
    featureCode: 'H11-B',
    featureName: 'Inventory Issue Advanced Flow',
    enabled: false,
    message:
      'H11-B advanced issue flow is not fully implemented yet. Compatibility placeholder is active.'
  };
}

function previewH11BIssueService(payload: any) {
  const inventoryItemId = String(payload?.inventoryItemId ?? '').trim();
  const requestedQty = Number(payload?.requestedQty ?? 0);
  const reason = String(payload?.reason ?? '').trim();

  if (!inventoryItemId) {
    throw new Error('inventoryItemId is required');
  }

  if (Number.isNaN(requestedQty) || requestedQty <= 0) {
    throw new Error('requestedQty must be greater than 0');
  }

  return {
    inventoryItemId,
    requestedQty,
    reason,
    allocatedQty: 0,
    remainingUnallocatedQty: requestedQty,
    allocations: [],
    message:
      'Compatibility preview only. Advanced H11-B allocation service has not been implemented yet.'
  };
}

function createH11BIssueService(payload: any) {
  const inventoryItemId = String(payload?.inventoryItemId ?? '').trim();
  const requestedQty = Number(payload?.requestedQty ?? 0);
  const reason = String(payload?.reason ?? '').trim();

  if (!inventoryItemId) {
    throw new Error('inventoryItemId is required');
  }

  if (Number.isNaN(requestedQty) || requestedQty <= 0) {
    throw new Error('requestedQty must be greater than 0');
  }

  const record: H11BIssueRecord = {
    id: `h11b-issue-${Date.now()}`,
    issueNo: buildIssueNo(),
    inventoryItemId,
    requestedQty,
    issuedQty: 0,
    reason,
    createdAt: new Date().toISOString()
  };

  h11bIssueStore.unshift(record);

  return record;
}

function listH11BIssuesService(search: string) {
  const q = String(search ?? '').trim().toLowerCase();

  const items = !q
    ? h11bIssueStore
    : h11bIssueStore.filter((item) => {
        return (
          item.issueNo.toLowerCase().includes(q) ||
          item.inventoryItemId.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q)
        );
      });

  return {
    items,
    total: items.length
  };
}

function getH11BIssueDetailService(issueId: string) {
  return h11bIssueStore.find((item) => item.id === issueId) ?? null;
}

const router = Router();

router.get('/context', (_req: Request, res: Response) => {
  res.json(getH11BContext());
});

router.post('/preview', (req: Request, res: Response) => {
  try {
    const result = previewH11BIssueService(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      message: error?.message || 'Preview failed'
    });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const issue = createH11BIssueService(req.body);
    res.status(201).json({ issue });
  } catch (error: any) {
    res.status(400).json({
      message: error?.message || 'Issue creation failed'
    });
  }
});

router.get('/', (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '');
    const result = listH11BIssuesService(q);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      message: error?.message || 'Issue list failed'
    });
  }
});

router.get('/:issueId/print', (req: Request, res: Response) => {
  try {
    const issueId = readSingle(req.params.issueId as string | string[] | undefined);
    const issue = getH11BIssueDetailService(issueId);

    if (!issue) {
      return res.status(404).json({
        message: 'Issue not found'
      });
    }

    res.json({
      printable: true,
      issue
    });
  } catch (error: any) {
    res.status(400).json({
      message: error?.message || 'Issue print failed'
    });
  }
});

router.get('/:issueId', (req: Request, res: Response) => {
  try {
    const issueId = readSingle(req.params.issueId as string | string[] | undefined);
    const issue = getH11BIssueDetailService(issueId);

    if (!issue) {
      return res.status(404).json({
        message: 'Issue not found'
      });
    }

    res.json({ issue });
  } catch (error: any) {
    res.status(400).json({
      message: error?.message || 'Issue detail failed'
    });
  }
});

export const h11bIssueRouter = router;
export default h11bIssueRouter;