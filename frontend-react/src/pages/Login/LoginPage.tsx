import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate, Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { AuthHeroVisual } from '../../components/AuthHeroVisual';
import { authStore } from '../../stores/auth.store';

export const LoginPage = observer(() => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await authStore.login(email, password);
    if (ok) nav('/');
  };

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
            <h2 className="auth-split__hero-title">Справочник и клиническая безопасность</h2>
            <p className="auth-split__hero-text">
              Поиск препаратов, проверка взаимодействий и противопоказаний для врачей и фармацевтов.
            </p>
            <ul className="auth-split__features">
              <li><Icon name="pill" size={16} /> Каталог с полными инструкциями</li>
              <li><Icon name="zap" size={16} /> Анализ взаимодействий</li>
              <li><Icon name="ban" size={16} /> Учёт противопоказаний</li>
            </ul>
          </div>
          <AuthHeroVisual />
        </div>
      </aside>

      <div className="auth-split__panel">
        <div className="auth-card auth-card--split">
          <h1 className="auth-title">Вход в систему</h1>
          <p className="auth-desc">Введите учётные данные для доступа к справочнику</p>
          <form onSubmit={submit} className="auth-form">
            <label className="field">
              Email
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="field">
              Пароль
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </label>
            {authStore.error && <p className="auth-error">{authStore.error}</p>}
            <button type="submit" disabled={authStore.loading} className="btn btn-primary auth-submit">
              {authStore.loading ? 'Вход…' : 'Войти'}
            </button>
          </form>
          <p className="auth-link">Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
        </div>
      </div>
    </div>
  );
});
