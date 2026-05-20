export const ROLES = ['admin', 'manager', 'operator', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_MANAGE: 'inventory.manage',
  WAREHOUSE_VIEW: 'warehouse.view',
  WAREHOUSE_MANAGE: 'warehouse.manage',
  TASKS_VIEW: 'tasks.view',
  TASKS_MANAGE: 'tasks.manage',
  ORDERS_VIEW: 'orders.view',
  ORDERS_MANAGE: 'orders.manage',
  REPORTS_VIEW: 'reports.view',
  AI_USE: 'ai.use',
  USERS_MANAGE: 'users.manage'
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface LoginResponseBody {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  user: AuthUser;
}