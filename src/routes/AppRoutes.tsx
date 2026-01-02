import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import SelectRolePage from "../pages/SelectRolePage";
import ProtectedRoute from "./ProtectedRoute";
import RequireRole from "./RequireRole";
import PublicRoute from "./PublicRoute";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* DEFAULT */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* LOGIN (public only) */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* ROLE SELECT */}
        <Route
          path="/select-role"
          element={
            <ProtectedRoute>
              <SelectRolePage />
            </ProtectedRoute>
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

        {/* DOCTOR */}
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

        {/* NURSE */}
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

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
