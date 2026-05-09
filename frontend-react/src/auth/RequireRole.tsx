import { Navigate } from 'react-router-dom';

type Props = {
  roles: string[];
  children: JSX.Element;
};

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem('pharma_session') || 'null');
  } catch {
    return null;
  }
}

export function RequireRole({ roles, children }: Props) {
  const session = getSession();

  if (!session?.token) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(session.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
