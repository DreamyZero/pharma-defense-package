import { useNavigate } from 'react-router-dom';

export function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#f7f6f2',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 28, marginBottom: 8, color: '#28251d' }}>Доступ запрещён</h2>
        <p style={{ color: '#7a7974', marginBottom: 24 }}>
          У вас недостаточно прав для просмотра этой страницы.
          Обратитесь к администратору системы.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            background: '#01696f',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 24px',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          На главную
        </button>
      </div>
    </div>
  );
}
