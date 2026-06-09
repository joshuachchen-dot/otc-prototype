export type Role = 'investor' | 'manager' | 'auditor';

export interface SessionUser {
  username: string;
  name: string;
  role: Role;
}

export const COOKIE_NAME = 'archon_session';

export const ROUTE_ROLES: Record<string, Role[]> = {
  '/investor': ['investor', 'manager'],
  '/manager':  ['manager'],
  '/auditor':  ['auditor', 'manager'],
  '/market':   ['investor', 'manager', 'auditor'],
  '/otc':      ['manager'],
};

export const ROLE_HOME: Record<Role, string> = {
  investor: '/investor',
  manager:  '/manager',
  auditor:  '/auditor',
};

export const ROLE_LABEL: Record<Role, string> = {
  investor: 'Investor',
  manager:  'Fund Manager',
  auditor:  'Auditor',
};

export const ROLE_COLOR: Record<Role, string> = {
  investor: '#6366f1',
  manager:  '#00c9a7',
  auditor:  '#f59e0b',
};
