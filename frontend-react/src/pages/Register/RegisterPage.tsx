import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate, Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { AuthHeroVisual } from '../../components/AuthHeroVisual';
import { authStore, Role } from '../../stores/auth.store';

const ROLES: { value: Role; label: string }[] = [
  { value: 'DOCTOR', label: 'Врач' },
  { value: 'PHARMACIST', label: 'Фармацевт' },
];

export const RegisterPage = observer(() => {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    organization: '',
    role: 'DOCTOR' as Role,
  });
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await authStore.register(
      form.fullName,
      form.email,
      form.password,
      form.organization,
      form.role,
    );
    if (ok) nav('/');
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="auth-split">
      <aside className="auth-split__hero" aria-hidden="true">
        <div className="auth-split__hero-grid">
          <div className="auth-split__hero-content">
            <div className="auth-split__brand">
              <div className="auth-split__brand-icon">
                <Icon name="pill" size={28} />
              </div>
              <span className="auth-split__brand-name">PharmaBase</span>
            </div>
            <h2 className="auth-split__hero-title">Регистрация специалиста</h2>
            <p className="auth-split__hero-text">
              Создайте учётную запись врача или фармацевта для работы с каталогом и проверками безопасности.
            </p>
          </div>
          <AuthHeroVisual />
        </div>
      </aside>

      <div className="auth-split__panel">
        <div className="auth-card auth-card--split">
          <h1 className="auth-title">Регистрация</h1>
          <p className="auth-desc">Заполните форму для создания учётной записи</p>
          <form onSubmit={submit} className="auth-form">
            <label className="field">
              ФИО
              <input className="input" value={form.fullName} onChange={set('fullName')} required />
            </label>
            <label className="field">
              Email
              <input className="input" type="email" value={form.email} onChange={set('email')} required />
            </label>
            <label className="field">
              Пароль
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={set('password')}
                required
                minLength={6}
              />
            </label>
            <label className="field">
              Организация
              <input className="input" value={form.organization} onChange={set('organization')} />
            </label>
            <label className="field">
              Роль
              <select className="input" value={form.role} onChange={set('role')}>
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
            {authStore.error && <p className="auth-error">{authStore.error}</p>}
            <button type="submit" disabled={authStore.loading} className="btn btn-primary auth-submit">
              {authStore.loading ? 'Регистрация…' : 'Создать аккаунт'}
            </button>
          </form>
          <p className="auth-link">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
        </div>
      </div>
    </div>
  );
});
