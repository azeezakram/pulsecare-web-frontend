import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

export default function PublicRoute({ children }: { children: React.ReactElement }) {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);

  if (!token) return children;

  return <Navigate to={`/dashboard/${role?.toLowerCase()}`} replace />;
}
