import { Router, Request, Response } from 'express';
import {
  createH11BIssueService,
  getH11BContext,
  getH11BIssueDetailService,
  listH11BIssuesService,
  previewH11BIssueService,
} from './h11b-issue-service';

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
    const issueId = Array.isArray(req.params.issueId)
  ? req.params.issueId[0]
  : req.params.issueId;

const issue = getH11BIssueDetailService(issueId);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    res.json({ issue });
  } catch (error: any) {
    res.status(400).json({
      message: error?.message || 'Issue detail failed',
    });
  }
});

export default router;
