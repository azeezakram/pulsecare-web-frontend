import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

export default function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);

  if (!token) return children;

  if (role === "ADMIN") return <Navigate to="/dashboard/admin/home" replace />;
  if (role === "DOCTOR") return <Navigate to="/dashboard/doctor/home" replace />;
  if (role === "NURSE")  return <Navigate to="/dashboard/nurse/home" replace />;

  return <Navigate to="/dashboard" replace />;
}
