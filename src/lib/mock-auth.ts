import type {
  AuthSessionPayload,
  AuthUser,
  LoginRequestBody,
  Permission,
  RefreshSessionResponseBody,
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

interface StoredSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
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

const accessTokenToRefreshToken = new Map<string, string>();
const refreshTokenToSession = new Map<string, StoredSession>();

function toAuthUser(account: MockAccount): AuthUser {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    permissions: [...rolePermissions[account.role], ...account.permissions]
  };
}

function createOpaqueToken(prefix: string, user: AuthUser) {
  const raw = `${prefix}:${user.id}:${user.email}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2)}`;
  return Buffer.from(raw).toString('base64url');
}

function buildSessionPayload(user: AuthUser): AuthSessionPayload {
  const accessToken = createOpaqueToken('access', user);
  const refreshToken = createOpaqueToken('refresh', user);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString();

  const storedSession: StoredSession = {
    user,
    accessToken,
    refreshToken,
    expiresAt
  };

  accessTokenToRefreshToken.set(accessToken, refreshToken);
  refreshTokenToSession.set(refreshToken, storedSession);

  return storedSession;
}

export function loginWithMockAccount(payload: LoginRequestBody): AuthSessionPayload | null {
  const account = mockAccounts.find(
    (item) =>
      item.email.toLowerCase() === payload.email.trim().toLowerCase() &&
      item.password === payload.password
  );

  if (!account) {
    return null;
  }

  const user = toAuthUser(account);
  return buildSessionPayload(user);
}

export function getUserByToken(token: string | null | undefined): AuthUser | null {
  if (!token) {
    return null;
  }

  const refreshToken = accessTokenToRefreshToken.get(token);

  if (!refreshToken) {
    return null;
  }

  const session = refreshTokenToSession.get(refreshToken);
  return session?.user ?? null;
}

export function refreshSessionByRefreshToken(
  refreshToken: string
): RefreshSessionResponseBody | null {
  const existing = refreshTokenToSession.get(refreshToken);

  if (!existing) {
    return null;
  }

  revokeSessionByRefreshToken(refreshToken);
  return buildSessionPayload(existing.user);
}

export function revokeSessionByRefreshToken(refreshToken: string | null | undefined) {
  if (!refreshToken) {
    return;
  }

  const session = refreshTokenToSession.get(refreshToken);

  if (session) {
    accessTokenToRefreshToken.delete(session.accessToken);
  }

  refreshTokenToSession.delete(refreshToken);
}

export function revokeSessionByAccessToken(accessToken: string | null | undefined) {
  if (!accessToken) {
    return;
  }

  const refreshToken = accessTokenToRefreshToken.get(accessToken);

  accessTokenToRefreshToken.delete(accessToken);

  if (refreshToken) {
    refreshTokenToSession.delete(refreshToken);
  }
}

export function getDemoAccounts() {
  return mockAccounts.map((item) => ({
    email: item.email,
    password: item.password,
    role: item.role
  }));
}

export function getSessionDebug(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const refreshToken = accessTokenToRefreshToken.get(token);

  if (!refreshToken) {
    return null;
  }

  const session = refreshTokenToSession.get(refreshToken);

  if (!session) {
    return null;
  }

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    user: session.user
  };
}