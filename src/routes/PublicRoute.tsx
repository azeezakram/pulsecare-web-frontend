import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

export default function PublicRoute({ children }: { children: React.ReactElement }) {
  const token = useAuthStore((s) => s.token);
  const roles = useAuthStore((s) => s.roles);
  const activeRole = useAuthStore((s) => s.activeRole);

  if (!token) return children;

  if (roles.length > 1 && !activeRole) {
    return <Navigate to="/select-role" replace />;
  }

  if (activeRole) {
    return <Navigate to={`/dashboard/${activeRole.toLowerCase()}`} replace />;
  }

  return <Navigate to="/select-role" replace />;
}
