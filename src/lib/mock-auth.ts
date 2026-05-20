import type {
  AuthUser,
  LoginRequestBody,
  LoginResponseBody,
  Permission,
  Role
} from '../types/auth';
import { PERMISSIONS } from '../types/auth';

interface MockAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  permissions: Permission[];
}

const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.WAREHOUSE_VIEW,
    PERMISSIONS.WAREHOUSE_MANAGE,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_MANAGE,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.AI_USE,
    PERMISSIONS.USERS_MANAGE
  ],
  manager: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.WAREHOUSE_VIEW,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_MANAGE,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.AI_USE
  ],
  operator: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.WAREHOUSE_VIEW,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_MANAGE,
    PERMISSIONS.ORDERS_VIEW
  ],
  viewer: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.WAREHOUSE_VIEW,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.REPORTS_VIEW
  ]
};

const mockAccounts: MockAccount[] = [
  {
    id: 'u-admin',
    name: 'Admin User',
    email: 'admin@smartops.local',
    password: 'password123',
    role: 'admin',
    permissions: []
  },
  {
    id: 'u-manager',
    name: 'Manager User',
    email: 'manager@smartops.local',
    password: 'password123',
    role: 'manager',
    permissions: []
  },
  {
    id: 'u-operator',
    name: 'Operator User',
    email: 'operator@smartops.local',
    password: 'password123',
    role: 'operator',
    permissions: []
  },
  {
    id: 'u-viewer',
    name: 'Viewer User',
    email: 'viewer@smartops.local',
    password: 'password123',
    role: 'viewer',
    permissions: []
  }
];

const activeTokens = new Map<string, AuthUser>();

function toAuthUser(account: MockAccount): AuthUser {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    permissions: [...rolePermissions[account.role], ...account.permissions]
  };
}

function createToken(user: AuthUser) {
  const raw = `${user.id}:${user.email}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  return Buffer.from(raw).toString('base64url');
}

export function loginWithMockAccount(payload: LoginRequestBody): LoginResponseBody | null {
  const account = mockAccounts.find(
    (item) =>
      item.email.toLowerCase() === payload.email.trim().toLowerCase() &&
      item.password === payload.password
  );

  if (!account) {
    return null;
  }

  const user = toAuthUser(account);
  const accessToken = createToken(user);

  activeTokens.set(accessToken, user);

  return {
    accessToken,
    refreshToken: `refresh-${accessToken}`,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    user
  };
}

export function getUserByToken(token: string | null | undefined): AuthUser | null {
  if (!token) {
    return null;
  }

  return activeTokens.get(token) ?? null;
}

export function logoutToken(token: string | null | undefined) {
  if (!token) {
    return;
  }

  activeTokens.delete(token);
}

export function getDemoAccounts() {
  return mockAccounts.map((item) => ({
    email: item.email,
    password: item.password,
    role: item.role
  }));
}