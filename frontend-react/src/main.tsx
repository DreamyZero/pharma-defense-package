import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { AdminPage } from './pages/Admin/AdminPage';
import { ForbiddenPage } from './pages/Forbidden';
import { RequireRole } from './auth/RequireRole';

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem('pharma_session') || 'null');
  } catch {
    return null;
  }
}

function App() {
  const session = getSession();
  const isAdmin = session?.role === 'ADMIN';

  return (
    <BrowserRouter>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}>
        <aside style={{ background: '#0f172a', color: '#fff', padding: 24 }}>
          <h2 style={{ margin: '0 0 24px' }}>Pharma Admin</h2>
          <nav style={{ display: 'grid', gap: 12 }}>
            {isAdmin && (
              <NavLink
                style={({ isActive }) => ({ color: '#fff', textDecoration: 'none', opacity: isActive ? 1 : 0.75 })}
                to="/"
              >
                Администрирование
              </NavLink>
            )}
            {!isAdmin && (
              <span style={{ color: '#94a3b8', fontSize: 13 }}>
                Нет доступа к разделам
              </span>
            )}
          </nav>
        </aside>
        <main style={{ padding: 24 }}>
          <Routes>
            <Route
              path="/"
              element={
                <RequireRole roles={['ADMIN']}>
                  <AdminPage />
                </RequireRole>
              }
            />
            <Route path="/forbidden" element={<ForbiddenPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
