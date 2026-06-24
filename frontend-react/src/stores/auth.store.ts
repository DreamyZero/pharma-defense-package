import { makeAutoObservable, runInAction } from 'mobx';
import { api, setSession, getSession, clearSession } from '../shared/api';

export type Role = 'ADMIN' | 'DOCTOR' | 'PHARMACIST';

export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  organization?: string;
  verified: boolean;
  createdAt: string;
}

class AuthStore {
  token: string | null = null;
  role: Role | null = null;
  userId: number | null = null;
  profile: UserProfile | null = null;
  loading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
    this.rehydrate();
  }

  private rehydrate() {
    const session = getSession();
    if (session) {
      this.token = session.token;
      this.role = session.role;
      this.userId = session.userId;
    }
  }

  get isAuthenticated() {
    return !!this.token;
  }

  get isAdmin() {
    return this.role === 'ADMIN';
  }

  get canEditProfile() {
    return this.role === 'DOCTOR' || this.role === 'PHARMACIST';
  }

  async login(email: string, password: string) {
    this.loading = true;
    this.error = null;
    try {
      const { data } = await api.post('/auth/login', { email, password });
      runInAction(() => {
        this.token = data.access_token;
        this.role = data.role;
        this.userId = data.userId;
      });
      setSession({ token: data.access_token, role: data.role, userId: data.userId, email });
      await this.fetchProfile();
      const { drugsStore } = await import('./drugs.store');
      drugsStore.loadCatalog();
      return true;
    } catch (e: any) {
      runInAction(() => {
        this.error = e.response?.data?.message || 'Ошибка входа';
      });
      return false;
    } finally {
      runInAction(() => { this.loading = false; });
    }
  }

  async register(fullName: string, email: string, password: string, organization: string, role: Role) {
    this.loading = true;
    this.error = null;
    try {
      const { data } = await api.post('/auth/register', { fullName, email, password, organization, role });
      runInAction(() => {
        this.token = data.access_token;
        this.role = data.role;
        this.userId = data.userId;
      });
      setSession({ token: data.access_token, role: data.role, userId: data.userId, email });
      await this.fetchProfile();
      const { drugsStore } = await import('./drugs.store');
      drugsStore.loadCatalog();
      return true;
    } catch (e: any) {
      runInAction(() => {
        this.error = e.response?.data?.message || 'Ошибка регистрации';
      });
      return false;
    } finally {
      runInAction(() => { this.loading = false; });
    }
  }

  async fetchProfile() {
    try {
      const { data } = await api.get('/auth/profile');
      runInAction(() => { this.profile = data; });
    } catch {}
  }

  async updateProfile(payload: {
    fullName?: string;
    organization?: string;
    email?: string;
    password?: string;
  }) {
    this.loading = true;
    this.error = null;
    try {
      const { data } = await api.patch('/users/me', payload);
      runInAction(() => { this.profile = data; });
      return true;
    } catch (e: any) {
      runInAction(() => {
        this.error = e.response?.data?.message || 'Не удалось сохранить профиль';
      });
      return false;
    } finally {
      runInAction(() => { this.loading = false; });
    }
  }

  logout() {
    this.token = null;
    this.role = null;
    this.userId = null;
    this.profile = null;
    clearSession();
    import('./drugs.store').then(({ drugsStore }) => drugsStore.resetCatalog());
  }
}

export const authStore = new AuthStore();
