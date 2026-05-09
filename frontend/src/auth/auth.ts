export interface AuthUser {
  email: string;
  role: string;
  token: string;
}

let session: AuthUser | null = null;

export function setSession(next: AuthUser | null) {
  session = next && next.token ? next : null;
}

export function getSession() {
  return session;
}

export function getToken() {
  return session?.token ?? '';
}