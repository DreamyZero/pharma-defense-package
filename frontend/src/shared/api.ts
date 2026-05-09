import { Drug } from '../types';
import { getToken } from '../auth/auth';

const API = 'http://localhost:3000';

async function req(path: string, options: RequestInit = {}) {
  const token = getToken();

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      Array.isArray(data?.message)
        ? data.message.join(', ')
        : data?.message || `HTTP ${response.status}`
    );
  }

  return data;
}

export async function login(email: string, password: string) {
  return req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(
  fullName: string,
  email: string,
  password: string,
  organization: string,
  role: string
) {
  return req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ fullName, email, password, organization, role }),
  });
}

export async function getProfile() { return req('/auth/profile'); }
export async function getDashboard() { return req('/dashboard'); }
export async function searchDrugs(query: string): Promise<Drug[]> {
  return req(`/drugs/search?q=${encodeURIComponent(query)}`);
}
export async function getInteractions(items: string) {
  return req('/interactions/check', {
    method: 'POST',
    body: JSON.stringify({ items: items.split(',').map(v => v.trim()).filter(Boolean) }),
  });
}
export async function getAnalogs(name: string) {
  const value = name.trim();
  if (!value) {
    throw new Error('Введите название препарата');
  }
  return req(`/analogs/${encodeURIComponent(value)}`);
}
export async function getContra(payload: { drug: string; age: number; context: string }) {
  return req('/contra/check', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
export async function getUsers() { return req('/admin/users'); }
export async function getEtlRuns() { return req('/admin/etl'); }