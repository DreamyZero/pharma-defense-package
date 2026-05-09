import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate, Link } from 'react-router-dom';
import { authStore, Role } from '../../stores/auth.store';

const ROLES: { value: Role; label: string }[] = [
  { value: 'DOCTOR', label: 'Врач' },
  { value: 'PHARMACIST', label: 'Фармацевт' },
];

export const RegisterPage = observer(() => {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', organization: '', role: 'DOCTOR' as Role });
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await authStore.register(form.fullName, form.email, form.password, form.organization, form.role);
    if (ok) nav('/');
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Регистрация</h1>
        <form onSubmit={submit} className="auth-form">
          <label>ФИО <input value={form.fullName} onChange={set('fullName')} required /></label>
          <label>Email <input type="email" value={form.email} onChange={set('email')} required /></label>
          <label>Пароль <input type="password" value={form.password} onChange={set('password')} required minLength={6} /></label>
          <label>Организация <input value={form.organization} onChange={set('organization')} /></label>
          <label>Роль
            <select value={form.role} onChange={set('role')}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
          {authStore.error && <p className="auth-error">{authStore.error}</p>}
          <button type="submit" disabled={authStore.loading} className="btn-primary">
            {authStore.loading ? 'Регистрация...' : 'Создать аккаунт'}
          </button>
        </form>
        <p className="auth-link">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
      </div>
    </div>
  );
});
