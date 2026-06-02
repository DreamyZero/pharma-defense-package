import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { authStore } from './stores/auth.store';
import { drugsStore } from './stores/drugs.store';
import { Icon } from './components/Icon';
import { LoginPage } from './pages/Login/LoginPage';
import { RegisterPage } from './pages/Register/RegisterPage';
import { SearchPage } from './pages/Search/SearchPage';
import { InteractionsPage } from './pages/Interactions/InteractionsPage';
import { ContraPage } from './pages/Contra/ContraPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { AdminPage } from './pages/Admin/AdminPage';
import GraphPage from './pages/GraphPage/GraphPage';
import { ForbiddenPage } from './pages/Forbidden';
import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/pages.css';

const NAV_ITEMS = [
  { to: '/search', label: 'Справочник', desc: 'Каталог и карточки препаратов', icon: 'pill', tone: 'teal' },
  { to: '/interactions', label: 'Взаимодействия', desc: 'Проверка совместимости списка', icon: 'zap', tone: 'amber' },
  { to: '/contra', label: 'Противопоказания', desc: 'Учёт возраста и контекста', icon: 'ban', tone: 'red' },
];

const ADMIN_NAV_ITEMS = [
  { to: '/graph', label: 'Граф знаний', desc: 'Связи в Neo4j', icon: 'network', tone: 'violet' },
];

function useTheme() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return { theme, toggle: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')) };
}

const RequireAuth = observer(({ children }: { children: JSX.Element }) => {
  if (!authStore.isAuthenticated) return <Navigate to="/login" replace />;
  return children;
});

const AppShell = observer(() => {
  const profile = authStore.profile;
  const { theme, toggle } = useTheme();

  React.useEffect(() => {
    authStore.fetchProfile();
    drugsStore.hydrateCatalogFromCache();
    drugsStore.loadCatalog();
  }, []);
  const initials = profile?.fullName
    ? profile.fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : profile?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/search" className="app-header__logo">
          <div className="app-header__logo-icon">
            <Icon name="pill" size={20} />
          </div>
          <span>PharmaBase</span>
        </NavLink>
        <div className="app-header__right">
          <div className="app-header__user">
            <div className="app-header__user-avatar">{initials}</div>
          </div>
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
            type="button"
            className="theme-toggle"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>
          <button type="button" className="nav-link-sm nav-link-sm--logout" onClick={() => authStore.logout()}>
            <Icon name="logout" size={16} />
            Выйти
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar app-sidebar--rich">
          <div className="sidebar-section">
            <div className="sidebar-label">Разделы</div>
            <nav className="sidebar-nav">
              {NAV_ITEMS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-item nav-item--rich nav-item--${item.tone}${isActive ? ' active' : ''}`
                  }
                >
                  <span className={`nav-item__icon-box nav-item__icon-box--${item.tone}`}>
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span className="nav-item__text">
                    <span className="nav-item__label">{item.label}</span>
                    <span className="nav-item__desc">{item.desc}</span>
                  </span>
                </NavLink>
              ))}
            </nav>
          </div>

          {authStore.isAdmin && (
            <div className="sidebar-section">
              <div className="sidebar-label">Администрирование</div>
              <nav className="sidebar-nav">
                {ADMIN_NAV_ITEMS.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `nav-item nav-item--rich nav-item--${item.tone}${isActive ? ' active' : ''}`
                    }
                  >
                    <span className={`nav-item__icon-box nav-item__icon-box--${item.tone}`}>
                      <Icon name={item.icon} size={18} />
                    </span>
                    <span className="nav-item__text">
                      <span className="nav-item__label">{item.label}</span>
                      <span className="nav-item__desc">{item.desc}</span>
                    </span>
                  </NavLink>
                ))}
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `nav-item nav-item--rich nav-item--violet${isActive ? ' active' : ''}`
                  }
                >
                  <span className="nav-item__icon-box nav-item__icon-box--violet">
                    <Icon name="shield" size={18} />
                  </span>
                  <span className="nav-item__text">
                    <span className="nav-item__label">Панель админа</span>
                    <span className="nav-item__desc">ETL, пользователи, аудит</span>
                  </span>
                </NavLink>
              </nav>
            </div>
          )}

          <div className="sidebar-footer">
            <NavLink
              to="/profile"
              className={({ isActive }) => `nav-item nav-item--rich${isActive ? ' active' : ''}`}
            >
              <span className="nav-item__icon-box nav-item__icon-box--teal">
                <Icon name="user" size={18} />
              </span>
              <span className="nav-item__text">
                <span className="nav-item__label">{profile?.fullName?.split(' ')[0] ?? 'Профиль'}</span>
                <span className="nav-item__desc">{profile?.email ?? ''}</span>
              </span>
            </NavLink>
          </div>
        </aside>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/search" replace />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/interactions" element={<InteractionsPage />} />
            <Route path="/contra" element={<ContraPage />} />
            <Route
              path="/graph"
              element={authStore.isAdmin ? <GraphPage /> : <Navigate to="/forbidden" replace />}
            />
            <Route path="/analogs" element={<Navigate to="/search" replace />} />
            <Route path="/profile" element={<ProfilePage />} />
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

const App = observer(() => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/*" element={<RequireAuth><AppShell /></RequireAuth>} />
    </Routes>
  </BrowserRouter>
));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
