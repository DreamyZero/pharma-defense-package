import { Icon } from './Icon';

const FEATURES = [
  {
    icon: 'network' as const,
    title: 'Граф знаний',
    desc: 'Связи в Neo4j',
  },
  {
    icon: 'zap' as const,
    title: 'Взаимодействия',
    desc: 'Проверка списка',
  },
];

export function AuthHeroVisual() {
  return (
    <div className="auth-hero-visual" aria-hidden="true">
      <div className="auth-hero-visual__graph-wrap">
        <svg className="auth-hero-visual__graph" viewBox="0 0 200 160" fill="none" aria-hidden="true">
          <circle cx="100" cy="80" r="64" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
          <circle cx="100" cy="80" r="40" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
          <line x1="100" y1="36" x2="64" y2="68" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
          <line x1="100" y1="36" x2="136" y2="64" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
          <line x1="64" y1="68" x2="76" y2="112" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
          <line x1="136" y1="64" x2="124" y2="112" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
          <line x1="76" y1="112" x2="124" y2="112" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
          <circle cx="100" cy="36" r="7" fill="rgba(255,255,255,0.95)" />
          <circle cx="64" cy="68" r="6" fill="rgba(186,230,253,0.95)" />
          <circle cx="136" cy="64" r="6" fill="rgba(167,243,208,0.95)" />
          <circle cx="76" cy="112" r="6" fill="rgba(254,215,170,0.95)" />
          <circle cx="124" cy="112" r="6" fill="rgba(254,202,202,0.95)" />
          <circle cx="100" cy="80" r="9" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
        </svg>
      </div>

      <ul className="auth-hero-visual__list">
        {FEATURES.map(item => (
          <li key={item.title} className="auth-hero-visual__item">
            <span className="auth-hero-visual__item-icon">
              <Icon name={item.icon} size={18} />
            </span>
            <div className="auth-hero-visual__item-text">
              <strong>{item.title}</strong>
              <span>{item.desc}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="auth-hero-visual__stats">
        <div className="auth-hero-visual__stat">
          <span className="auth-hero-visual__stat-value">40+</span>
          <span className="auth-hero-visual__stat-label">Препаратов</span>
        </div>
        <div className="auth-hero-visual__stat">
          <span className="auth-hero-visual__stat-value">28K</span>
          <span className="auth-hero-visual__stat-label">Связей</span>
        </div>
      </div>
    </div>
  );
}
