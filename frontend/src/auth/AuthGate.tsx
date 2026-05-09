import { useState } from 'react';
import { login, register } from '../shared/api';
import { setSession } from './auth';

export function AuthGate({ onReady }: { onReady: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({
    fullName: '',
    email: 'doctor@clinic.local',
    password: 'password123',
    organization: 'Городская больница №1',
    role: 'DOCTOR',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    try {
      setLoading(true);
      setError('');

      const result =
        mode === 'login'
          ? await login(form.email, form.password)
          : await register(form.fullName, form.email, form.password, form.organization, form.role);

      const token = result?.access_token ?? result?.accessToken ?? result?.token ?? '';
      const email = result?.user?.email ?? result?.email ?? form.email;
      const role = result?.user?.role ?? result?.role ?? form.role;

      if (!token) {
        throw new Error('Сервер не вернул токен авторизации.');
      }

      setSession({ email, role, token });
      onReady();
    } catch (e: any) {
      setError(e?.message || 'Не удалось выполнить авторизацию.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
      <div className="panel" style={{ width: 'min(560px,100%)' }}>
        <div className="chip primary">Безопасный вход</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px,3vw,48px)', margin: '12px 0' }}>
          Pharma Platform
        </h2>
        <p className="muted">Войдите как врач, фармацевт или администратор.</p>

        <div className="field">
          <label>Email</label>
          <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>

        {mode === 'register' && (
          <>
            <div className="field">
              <label>ФИО</label>
              <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="field">
              <label>Организация</label>
              <input value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} />
            </div>
            <div className="field">
              <label>Роль</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="DOCTOR">Врач</option>
                <option value="PHARMACIST">Фармацевт</option>
                <option value="ADMIN">Администратор</option>
              </select>
            </div>
          </>
        )}

        <div className="field">
          <label>Пароль</label>
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        </div>

        {error && <div className="notice">{error}</div>}

        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button className="btn" onClick={submit} disabled={loading}>
            {loading ? 'Подождите...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
          <button
            className="ghost"
            onClick={() => {
              setError('');
              setMode(mode === 'login' ? 'register' : 'login');
            }}
            disabled={loading}
          >
            {mode === 'login' ? 'Регистрация' : 'У меня уже есть аккаунт'}
          </button>
        </div>

        <div className="muted" style={{ marginTop: 16 }}>
          Тестовый вход: doctor@clinic.local / password123, admin@pharma.local / password123
        </div>
      </div>
    </div>
  );
}