import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

export default function RequireRole({ role, children } : { role: string; children: React.ReactElement }) {
  const { activeRole, roles } = useAuthStore();

  // User has multiple roles but didn't choose yet
  if (roles.length > 1 && !activeRole) {
    return <Navigate to="/select-role" replace />;
  }

  if (activeRole !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
