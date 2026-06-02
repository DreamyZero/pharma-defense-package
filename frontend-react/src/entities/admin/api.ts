import { api } from '../../config/api';

export type AdminUser = {
  id: number;
  fullName: string;
  email: string;
  role: 'DOCTOR' | 'PHARMACIST' | 'ADMIN';
  organization: string | null;
  verified: boolean;
  createdAt: string;
};

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data } = await api.get('/admin/users');
  return data;
}

export async function setUserRole(userId: number, role: AdminUser['role']) {
  const { data } = await api.patch(`/admin/users/${userId}/role`, { role });
  return data;
}

export async function updateAdminUser(
  userId: number,
  payload: { email?: string; password?: string },
) {
  const { data } = await api.patch(`/admin/users/${userId}`, payload);
  return data as AdminUser;
}
