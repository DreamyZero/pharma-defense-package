import axios from 'axios';

// ─── Session ───────────────────────────────────────────────────────────────

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

// ─── Axios instance ─────────────────────────────────────────────────────────

export const API_BASE = 'http://localhost:3001';

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── AuthGate helper ─────────────────────────────────────────────────────────
// Used by pages to check role before rendering.
// Returns true if the current session has one of the required roles.
export function AuthGate(requiredRoles: string[]): boolean {
  const session = getSession();
  if (!session?.token) return false;
  return requiredRoles.includes(session.role);
}
