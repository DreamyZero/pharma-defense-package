import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { authStore } from './stores/auth.store';
import { LoginPage } from './pages/Login/LoginPage';
import { RegisterPage } from './pages/Register/RegisterPage';
import { SearchPage } from './pages/Search/SearchPage';
import { InteractionsPage } from './pages/Interactions/InteractionsPage';
import { AnalogsPage } from './pages/Analogs/AnalogsPage';
import { ContraPage } from './pages/Contra/ContraPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { AdminPage } from './pages/Admin/AdminPage';
import { GraphPage } from './pages/GraphPage/GraphPage';
import { ForbiddenPage } from './pages/Forbidden';
import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/pages.css';

// Охранник — только для авторизованных
const RequireAuth = observer(({ children }: { children: JSX.Element }) => {
  if (!authStore.isAuthenticated) return <Navigate to="/login" replace />;
  return children;
});

const NAV_ITEMS = [
  { to: '/search',       label: 'Поиск препаратов',    icon: '🔍' },
  { to: '/interactions', label: 'Взаимодействия',       icon: '⚡' },
  { to: '/analogs',      label: 'Аналоги',              icon: '🔄' },
  { to: '/contra',       label: 'Противопоказания',     icon: '⛔' },
  { to: '/graph',        label: 'Граф препаратов',      icon: '🕸' },
];

const AppShell = observer(() => {
  const profile = authStore.profile;

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <a href="/search" className="app-header__logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="PharmaBase">
            <rect width="28" height="28" rx="8" fill="var(--color-primary)" />
            <path d="M8 14h12M14 8v12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span>PharmaBase</span>
        </a>
        <div className="app-header__right">
          {profile && (
            <span className="app-header__user">
              {profile.fullName || profile.email}
            </span>
          )}
          <NavLink to="/profile" className="nav-link-sm">Профиль</NavLink>
          {authStore.isAdmin && (
            <NavLink to="/admin" className="nav-link-sm nav-link-sm--admin">Админ</NavLink>
          )}
          <button
            className="nav-link-sm nav-link-sm--logout"
            onClick={() => authStore.logout()}
          >
            Выйти
          </button>
        </div>
      </header>

      <div className="app-body">
        {/* Sidebar */}
        <aside className="app-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Функции</div>
            <nav className="sidebar-nav">
              {NAV_ITEMS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <span className="nav-item__icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/search" replace />} />
            <Route path="/search"       element={<SearchPage />} />
            <Route path="/interactions" element={<InteractionsPage />} />
            <Route path="/analogs"      element={<AnalogsPage />} />
            <Route path="/contra"       element={<ContraPage />} />
            <Route path="/graph"        element={<GraphPage />} />
            <Route path="/profile"      element={<ProfilePage />} />
            <Route
              path="/admin"
              element={authStore.isAdmin ? <AdminPage /> : <Navigate to="/forbidden" replace />}
            />
            <Route path="/forbidden" element={<ForbiddenPage />} />
            <Route path="*" element={<Navigate to="/search" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
});

const App = observer(() => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
