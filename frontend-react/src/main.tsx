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
import GraphPage from './pages/GraphPage/GraphPage';
import { ForbiddenPage } from './pages/Forbidden';
import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/pages.css';

/* ─── Icons (inline SVG via Lucide paths) ─────────────────────────── */
const Icon = ({ name, size = 18 }: { name: string; size?: number }) => {
  const icons: Record<string, JSX.Element> = {
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    zap: <><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></>,
    repeat: <><path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
    ban: <><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></>,
    network: <><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></>,
    user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    shield: <><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></>,
    home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></>,
    moon: <><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></>,
    cross: <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      {icons[name]}
    </svg>
  );
};

/* ─── Auth guard ──────────────────────────────────────────────────── */
const RequireAuth = observer(({ children }: { children: JSX.Element }) => {
  if (!authStore.isAuthenticated) return <Navigate to="/login" replace />;
  return children;
});

/* ─── Nav items ───────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { to: '/search',       label: 'Поиск препаратов',  icon: 'search'  },
  { to: '/interactions', label: 'Взаимодействия',     icon: 'zap'     },
  { to: '/analogs',      label: 'Аналоги',            icon: 'repeat'  },
  { to: '/contra',       label: 'Противопоказания',   icon: 'ban'     },
  { to: '/graph',        label: 'Граф знаний',        icon: 'network' },
];

/* ─── Theme toggle logic ──────────────────────────────────────────── */
function useTheme() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return { theme, toggle };
}

/* ─── App Shell ───────────────────────────────────────────────────── */
const AppShell = observer(() => {
  const profile = authStore.profile;
  const { theme, toggle } = useTheme();

  const initials = profile?.fullName
    ? profile.fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : profile?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <a href="/search" className="app-header__logo">
          <div className="app-header__logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-label="PharmaBase">
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"
                fill="none" stroke="white" strokeWidth="1.5"/>
              <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span>PharmaBase</span>
        </a>

        <div className="app-header__right">
          {profile && (
            <div className="app-header__user">
              <div className="app-header__user-avatar">{initials}</div>
              <span className="sr-only">{profile.fullName || profile.email}</span>
            </div>
          )}
          <NavLink to="/profile" className="nav-link-sm">
            <Icon name="user" size={16} />
            Профиль
          </NavLink>
          {authStore.isAdmin && (
            <NavLink to="/admin" className="nav-link-sm nav-link-sm--admin">
              <Icon name="shield" size={16} />
              Админ
            </NavLink>
          )}
          <button
            className="theme-toggle"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>
          <button
            className="nav-link-sm nav-link-sm--logout"
            onClick={() => authStore.logout()}
          >
            <Icon name="logout" size={16} />
            Выйти
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="app-body">
        {/* Sidebar */}
        <aside className="app-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Основное</div>
            <nav className="sidebar-nav">
              <NavLink
                to="/search"
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-item__icon"><Icon name="home" size={18} /></span>
                <span>Дашборд</span>
              </NavLink>
            </nav>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">Функции</div>
            <nav className="sidebar-nav">
              {NAV_ITEMS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <span className="nav-item__icon"><Icon name={item.icon} size={18} /></span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="sidebar-footer">
            <NavLink
              to="/profile"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-item__icon"><Icon name="user" size={18} /></span>
              <span>{profile?.fullName?.split(' ')[0] ?? 'Профиль'}</span>
            </NavLink>
          </div>
        </aside>

        {/* Main */}
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

/* ─── Root ────────────────────────────────────────────────────────── */
const App = observer(() => (
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
));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
