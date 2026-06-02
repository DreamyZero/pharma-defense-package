import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { authStore } from '../../stores/auth.store';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Администратор',
  DOCTOR: 'Врач',
  PHARMACIST: 'Фармацевт',
};

export const ProfilePage = observer(() => {
  const p = authStore.profile;
  const nav = useNavigate();
  const canEdit = authStore.canEditProfile;
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authStore.profile && authStore.isAuthenticated) {
      authStore.fetchProfile();
    }
  }, []);

  useEffect(() => {
    if (p) {
      setFullName(p.fullName);
      setEmail(p.email);
      setOrganization(p.organization || '');
      setPassword('');
    }
  }, [p?.id, p?.fullName, p?.email, p?.organization]);

  const handleLogout = () => {
    authStore.logout();
    nav('/login');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaved(false);
    const payload: {
      fullName?: string;
      organization?: string;
      email?: string;
      password?: string;
    } = {
      fullName: fullName.trim(),
      organization: organization.trim() || undefined,
    };
    if (email.trim() && email.trim() !== p?.email) {
      payload.email = email.trim();
    }
    if (password.trim().length >= 8) {
      payload.password = password.trim();
    }
    const ok = await authStore.updateProfile(payload);
    if (ok) {
      setEditing(false);
      setPassword('');
      setSaved(true);
    }
  };

  const handleCancel = () => {
    if (p) {
      setFullName(p.fullName);
      setEmail(p.email);
      setOrganization(p.organization || '');
      setPassword('');
    }
    setEditing(false);
    authStore.error = null;
  };

  if (!p) return <div className="loading-state">Загрузка профиля...</div>;

  return (
    <div className="profile-page">
      <div className="profile-page__head">
        <h1 className="page-title">Профиль</h1>
        {canEdit && !editing && (
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
            Редактировать
          </button>
        )}
        {canEdit && editing && (
          <button type="button" className="btn-secondary" onClick={handleCancel}>
            Отмена
          </button>
        )}
      </div>

      {saved && <p className="profile-page__success">Изменения сохранены.</p>}
      {authStore.error && <p className="auth-error">{authStore.error}</p>}

      {!canEdit && (
        <p className="profile-page__hint text-muted">
          Редактирование профиля доступно врачам и фармацевтам. Администратор управляет учётными записями в панели админа.
        </p>
      )}

      <div className="profile-card">
        <div className="profile-avatar">{p.fullName[0]?.toUpperCase()}</div>
        <div className="profile-info profile-info--wide">
          {editing && canEdit ? (
            <form className="profile-form" onSubmit={handleSave}>
              <label className="profile-form__field">
                <span>ФИО</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  minLength={2}
                />
              </label>
              <label className="profile-form__field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="profile-form__field">
                <span>Новый пароль</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Оставьте пустым, если не меняете (мин. 8 символов)"
                  minLength={8}
                />
              </label>
              <label className="profile-form__field">
                <span>Организация</span>
                <input
                  type="text"
                  value={organization}
                  onChange={e => setOrganization(e.target.value)}
                  placeholder="Клиника, аптека…"
                />
              </label>
              <div className="profile-form__readonly">
                <span className="badge badge--primary">{ROLE_LABELS[p.role] || p.role}</span>
                <span className="text-muted text-xs">
                  Статус: {p.verified ? 'Подтверждён' : 'Ожидает подтверждения'}
                </span>
              </div>
              <button type="submit" className="btn-primary" disabled={authStore.loading}>
                {authStore.loading ? 'Сохранение…' : 'Сохранить'}
              </button>
            </form>
          ) : (
            <>
              <h2>{p.fullName}</h2>
              <p className="text-muted">{p.email}</p>
              <span className="badge badge--primary">{ROLE_LABELS[p.role] || p.role}</span>
              {p.organization ? (
                <p className="profile-info__org">{p.organization}</p>
              ) : (
                <p className="text-muted text-xs">Организация не указана</p>
              )}
              <dl className="profile-dl">
                <div>
                  <dt>Зарегистрирован</dt>
                  <dd>{new Date(p.createdAt).toLocaleDateString('ru-RU')}</dd>
                </div>
                <div>
                  <dt>Статус</dt>
                  <dd>{p.verified ? 'Подтверждён' : 'Ожидает подтверждения'}</dd>
                </div>
                <div>
                  <dt>ID</dt>
                  <dd>{p.id}</dd>
                </div>
              </dl>
            </>
          )}
        </div>
      </div>

      <button type="button" className="btn-danger" onClick={handleLogout}>
        Выйти из системы
      </button>
    </div>
  );
});
