import * as fs from 'fs';
import * as path from 'path';
import { H11BIssueRecord } from './h11b-types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'h11b-stock-issues.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ items: [] }, null, 2), 'utf8');
  }
}

function readData(): { items: H11BIssueRecord[] } {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw || '{"items":[]}');
  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
  };
}

function writeData(data: { items: H11BIssueRecord[] }) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export function listH11BIssuesRepo(): H11BIssueRecord[] {
  return readData().items;
}

export function getH11BIssueByIdRepo(issueId: string): H11BIssueRecord | null {
  const data = readData();
  return data.items.find((item) => item.id === issueId) || null;
}

export function createH11BIssueRepo(issue: H11BIssueRecord): H11BIssueRecord {
  const data = readData();
  data.items.unshift(issue);
  writeData(data);
  return issue;
}
