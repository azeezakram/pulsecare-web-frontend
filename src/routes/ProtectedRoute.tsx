import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
