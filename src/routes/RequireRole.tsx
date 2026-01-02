import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

export default function RequireRole({
  role,
  children,
}: {
  role: string;
  children: React.ReactElement;
}) {
  const userRole = useAuthStore((s) => s.role);

  if (userRole !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
