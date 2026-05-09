import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { authStore } from '../../stores/auth.store';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Администратор', DOCTOR: 'Врач', PHARMACIST: 'Фармацевт',
};

export const ProfilePage = observer(() => {
  const p = authStore.profile;
  const nav = useNavigate();

  const handleLogout = () => {
    authStore.logout();
    nav('/login');
  };

  if (!p) return <div className="loading-state">Загрузка профиля...</div>;

  return (
    <div className="profile-page">
      <h1 className="page-title">Профиль</h1>
      <div className="profile-card">
        <div className="profile-avatar">{p.fullName[0]}</div>
        <div className="profile-info">
          <h2>{p.fullName}</h2>
          <p className="text-muted">{p.email}</p>
          <span className="badge badge--primary">{ROLE_LABELS[p.role] || p.role}</span>
          {p.organization && <p style={{ marginTop: 'var(--sp-2)' }}>{p.organization}</p>}
          <p className="text-muted text-xs" style={{ marginTop: 'var(--sp-2)' }}>
            Зарегистрирован: {new Date(p.createdAt).toLocaleDateString('ru-RU')}
          </p>
          <p className="text-muted text-xs">
            Статус: {p.verified ? '✓ Подтверждён' : '⏳ Ожидает подтверждения'}
          </p>
        </div>
      </div>
      <button className="btn-danger" onClick={handleLogout}>Выйти из системы</button>
    </div>
  );
});
