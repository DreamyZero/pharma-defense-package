import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate, Link } from 'react-router-dom';
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
    <div className="auth-wrap">
      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo-icon" aria-hidden="true">Rx</span>
            <span className="auth-logo-text">PharmaBase</span>
          </div>
          <h1 className="auth-title">Вход в систему</h1>
          <p className="auth-desc">Введите учётные данные для доступа к справочнику</p>
          <form onSubmit={submit} className="auth-form">
            <label className="field">
              Email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </label>
            <label className="field">
              Пароль
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </label>
            {authStore.error && <p className="auth-error">{authStore.error}</p>}
            <button type="submit" disabled={authStore.loading} className="btn btn-primary auth-submit">
              {authStore.loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
          <p className="auth-link">Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
        </div>
      </div>
    </div>
  );
});
