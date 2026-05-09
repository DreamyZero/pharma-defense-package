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
      <div className="auth-card">
        <h1 className="auth-title">Вход в систему</h1>
        <form onSubmit={submit} className="auth-form">
          <label>Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label>Пароль
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>
          {authStore.error && <p className="auth-error">{authStore.error}</p>}
          <button type="submit" disabled={authStore.loading} className="btn-primary">
            {authStore.loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <p className="auth-link">Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
      </div>
    </div>
  );
});
