// src/routes/RequireRole.tsx
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

type Props = {
  roles: string[];                 // ✅ allow multiple roles
  children: React.ReactElement;
};

export default function RequireRole({ roles, children }: Props) {
  const userRole = useAuthStore((s) => s.role);

  if (!userRole || !roles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
