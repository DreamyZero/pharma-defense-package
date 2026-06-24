import { NavLink } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { Icon } from './Icon';
import { authStore } from '../stores/auth.store';

const ITEMS = [
  { to: '/search', label: 'Каталог', icon: 'pill' },
  { to: '/interactions', label: 'Взаим.', icon: 'zap' },
  { to: '/contra', label: 'Противоп.', icon: 'ban' },
  { to: '/graph', label: 'Граф', icon: 'network' },
  { to: '/profile', label: 'Профиль', icon: 'user' },
];

export const MobileNav = observer(() => {
  const items = authStore.isAdmin
    ? [...ITEMS, { to: '/admin', label: 'Админ', icon: 'shield' }]
    : ITEMS;

  return (
    <nav className="mobile-nav" aria-label="Мобильная навигация">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `mobile-nav__item${isActive ? ' active' : ''}`}
        >
          <Icon name={item.icon} size={20} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
});
