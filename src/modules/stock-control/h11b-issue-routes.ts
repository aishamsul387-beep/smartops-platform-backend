import { Router, Request, Response } from 'express';
import {


  createH11BIssueService,
  getH11BContext,
  getH11BIssueDetailService,
  listH11BIssuesService,
  previewH11BIssueService,
} from './h11b-issue-service';


function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
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
      message: error?.message || 'Preview failed',
    });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const issue = createH11BIssueService(req.body);
    res.status(201).json({ issue });
  } catch (error: any) {
    res.status(400).json({
      message: error?.message || 'Issue creation failed',
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
      message: error?.message || 'Issue list failed',
    });
  }
});

router.get('/:issueId/print', (req: Request, res: Response) => {
  try {
    const issue = getH11BIssueDetailService(readSingle(req.params.issueId as string | string[] | undefined));
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    return res.json({ issue });
  } catch (error: any) {
    return res.status(400).json({
      message: error?.message || 'Issue print failed',
    });
  }
});

router.get('/:issueId', (req: Request, res: Response) => {
  try {
    const issue = getH11BIssueDetailService(readSingle(req.params.issueId as string | string[] | undefined));
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    return res.json({ issue });
  } catch (error: any) {
    return res.status(400).json({
      message: error?.message || 'Issue detail failed',
    });
  }
});

export default router;
