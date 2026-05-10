// This file is intentionally left as a re-export of shared/api to avoid breaking
// any potential future imports. The actual axios instance lives in shared/api.ts.
export { api, API_BASE } from '../shared/api';
export const setToken = (_value: string) => {
  // No-op: token is read from sessionStorage on every request via shared/api interceptor.
  // Kept for compatibility only.
};
