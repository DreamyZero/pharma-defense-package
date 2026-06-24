import axios from 'axios';

export const API_BASE = 'http://localhost:3001';

export const API_ROUTES = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    profile: '/auth/profile',
  },
  users: {
    me: '/users/me',
  },
  drugs: {
    catalog: '/drugs/catalog',
    search: '/drugs/search',
    bySlug: (slug: string) => `/drugs/${slug}`,
  },
  analogs: {
    byName: (name: string) => `/analogs/${encodeURIComponent(name)}`,
  },
  interactions: {
    check: '/interactions/check',
  },
  contra: {
    check: '/contra/check',
  },
  graph: {
    full: '/graph/full',
    drug: (drugId: number | string) => `/graph/drug/${drugId}`,
    interactions: '/graph/interactions',
  },
  admin: {
    users: '/admin/users',
    userRole: (userId: number) => `/admin/users/${userId}/role`,
    user: (userId: number) => `/admin/users/${userId}`,
  },
  audit: {
    list: '/audit',
    clear: '/audit',
  },
  imports: {
    list: '/imports',
    run: '/imports/run',
    clear: '/imports',
    report: '/imports/report',
    reportHtml: '/imports/report/html',
    reportCsv: '/imports/report/csv',
    sync: '/imports/sync',
  },
  dashboard: '/dashboard',
} as const;

export type Session = {
  token: string;
  role: 'ADMIN' | 'DOCTOR' | 'PHARMACIST';
  userId: number;
  email: string;
};

const SESSION_KEY = 'pharma_session';

export function getSession(): Session | null {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setSession(session: Session | null): void {
  if (session === null) {
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

export type Drug = {
  id: number;
  tradeName: string;
  inn: string;
  atcCode: string;
  manufacturer: string;
  dosageForm: string;
  status: string;
  registrationNumber?: string;
};

export type PageKey =
  | 'dashboard'
  | 'search'
  | 'interactions'
  | 'analogs'
  | 'contra'
  | 'profile'
  | 'admin'
  | 'graph'
  | 'api';

export function AuthGate(requiredRoles: string[]): boolean {
  const session = getSession();
  if (!session?.token) return false;
  return requiredRoles.includes(session.role);
}

export const setToken = (_value: string) => {};
