import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import RequireRole from "./RequireRole";
import PublicRoute from "./PublicRoute";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute>
              <RequireRole role="ADMIN">
                <h1>Admin page</h1>
              </RequireRole>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/doctor"
          element={
            <ProtectedRoute>
              <RequireRole role="DOCTOR">
                <h1>Doctor page</h1>
              </RequireRole>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/nurse"
          element={
            <ProtectedRoute>
              <RequireRole role="NURSE">
                <h1>Nurse page</h1>
              </RequireRole>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>

  );
}
