
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import RequireRole from "./RequireRole";
import PublicRoute from "./PublicRoute";
import DashboardPage from "../pages/DashboardPage";

import AdminHomePage from "../pages/admin/AdminHomePage";
import AdminUsersPage from "../pages/admin/user-management/AdminUsersPage";
import AdminDoctorPage from "../pages/admin/AdminDoctorPage";
import AdminDepartmentPage from "../pages/admin/AdminDepartmentPage";
import AdminPatientAdmissionPage from "../pages/admin/AdminPatientAdmissionPage";
import AdminWardPage from "../pages/admin/AdminWardPage";
import AdminPatientsPage from "../pages/admin/AdminPatientsPage";
import AdminSettingPage from "../pages/admin/AdminSettingPage";
import { useAuthStore } from "../store/auth-store";

import NurseHomePage from "../pages/nurse/NurseHomePage";
import NurseTriagePage from "../pages/nurse/NurseTriagePage";
import NurseDoctorPage from "../pages/nurse/NurseDoctorPage";
import NurseDepartmentPage from "../pages/nurse/NurseDepartmentPage";
import NursePatientsPage from "../pages/nurse/NursePatientsPage";
import NursePatientAdmissionPage from "../pages/nurse/NursePatientAdmissionPage";
import NurseWardPage from "../pages/nurse/NurseWardPage";
import NurseBedPage from "../pages/nurse/NurseBedPage";
import NurseProfilePage from "../pages/nurse/NurseProfilePage";
import NurseSettingPage from "../pages/nurse/NurseSettingPage";

import DoctorHomePage from "../pages/doctor/DoctorHomePage";
import DoctorPatientQueuePage from "../pages/doctor/DoctorPatientQueuePage";
import DoctorPatientsAdmissionPage from "../pages/doctor/DoctorPatientsAdmissionPage";
import DoctorProfilePage from "../pages/doctor/DoctorProfilePage";
import DoctorSettingPage from "../pages/doctor/DoctorSettingPage";
import DoctorPatientTreatmentLogPage from "../pages/doctor/DoctorPatientTreatmentLogPage";
import DoctorTriagePage from "../pages/doctor/DoctorTriagePage";

import AdminBedPage from "../pages/admin/AdminBedPage";
import AdminProfilePage from "../pages/admin/AdminProfilePage";
import AdminCreateUserPage from "../pages/admin/user-management/AdminCreateUserPage";
import AdminUserDetailsPage from "../pages/admin/user-management/AdminUserDetailsPage";
import AdminUpdateUserPage from "../pages/admin/user-management/AdminUserUpdatePage";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];
const DOCTOR_ROLES = ["DOCTOR", "SUPER_DOCTOR"];
const NURSE_ROLES = ["NURSE", "SUPER_NURSE"];

export default function AppRoutes() {
  const role = useAuthStore((s) => s.role);

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
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to={`/dashboard/${role}/home`} replace />} />

          <Route path="admin/home" element={<RequireRole roles={ADMIN_ROLES}><AdminHomePage /></RequireRole>} />
          <Route path="admin/users" element={<RequireRole roles={ADMIN_ROLES}><AdminUsersPage /></RequireRole>} />
          <Route path="admin/users/new" element={<RequireRole roles={ADMIN_ROLES}><AdminCreateUserPage /></RequireRole>} />
          <Route path="admin/users/:id" element={<RequireRole roles={ADMIN_ROLES}><AdminUserDetailsPage /></RequireRole>} />
          <Route path="admin/users/:id/edit" element={<RequireRole roles={ADMIN_ROLES}><AdminUpdateUserPage /></RequireRole>} />

          <Route path="admin/doctors" element={<RequireRole roles={ADMIN_ROLES}><AdminDoctorPage /></RequireRole>} />
          <Route path="admin/departments" element={<RequireRole roles={ADMIN_ROLES}><AdminDepartmentPage /></RequireRole>} />
          <Route path="admin/patients" element={<RequireRole roles={ADMIN_ROLES}><AdminPatientsPage /></RequireRole>} />
          <Route path="admin/patient-addmissions" element={<RequireRole roles={ADMIN_ROLES}><AdminPatientAdmissionPage /></RequireRole>} />
          <Route path="admin/departments/wards" element={<RequireRole roles={ADMIN_ROLES}><AdminWardPage /></RequireRole>} />
          <Route path="admin/departments/wards/beds" element={<RequireRole roles={ADMIN_ROLES}><AdminBedPage /></RequireRole>} />
          <Route path="admin/settings/profile" element={<RequireRole roles={ADMIN_ROLES}><AdminProfilePage /></RequireRole>} />
          <Route path="admin/settings" element={<RequireRole roles={ADMIN_ROLES}><AdminSettingPage /></RequireRole>} />

          <Route path="nurse/home" element={<RequireRole roles={NURSE_ROLES}><NurseHomePage /></RequireRole>} />
          <Route path="nurse/triage" element={<RequireRole roles={NURSE_ROLES}><NurseTriagePage /></RequireRole>} />
          <Route path="nurse/doctors" element={<RequireRole roles={NURSE_ROLES}><NurseDoctorPage /></RequireRole>} />
          <Route path="nurse/departments" element={<RequireRole roles={NURSE_ROLES}><NurseDepartmentPage /></RequireRole>} />
          <Route path="nurse/patients" element={<RequireRole roles={NURSE_ROLES}><NursePatientsPage /></RequireRole>} />
          <Route path="nurse/patient-addmissions" element={<RequireRole roles={NURSE_ROLES}><NursePatientAdmissionPage /></RequireRole>} />
          <Route path="nurse/departments/wards" element={<RequireRole roles={NURSE_ROLES}><NurseWardPage /></RequireRole>} />
          <Route path="nurse/departments/wards/beds" element={<RequireRole roles={NURSE_ROLES}><NurseBedPage /></RequireRole>} />
          <Route path="nurse/settings/profile" element={<RequireRole roles={NURSE_ROLES}><NurseProfilePage /></RequireRole>} />
          <Route path="nurse/settings" element={<RequireRole roles={NURSE_ROLES}><NurseSettingPage /></RequireRole>} />

         
          <Route path="doctor/home" element={<RequireRole roles={DOCTOR_ROLES}><DoctorHomePage /></RequireRole>} />
          <Route path="doctor/patient-queue" element={<RequireRole roles={DOCTOR_ROLES}><DoctorPatientQueuePage /></RequireRole>} />
          <Route path="doctor/patient-admission" element={<RequireRole roles={DOCTOR_ROLES}><DoctorPatientsAdmissionPage /></RequireRole>} />
          <Route path="doctor/patient-treatment-log" element={<RequireRole roles={DOCTOR_ROLES}><DoctorPatientTreatmentLogPage /></RequireRole>} />
          <Route path="doctor/triage" element={<RequireRole roles={DOCTOR_ROLES}><DoctorTriagePage /></RequireRole>} />
          <Route path="doctor/settings/profile" element={<RequireRole roles={DOCTOR_ROLES}><DoctorProfilePage /></RequireRole>} />
          <Route path="doctor/settings" element={<RequireRole roles={DOCTOR_ROLES}><DoctorSettingPage /></RequireRole>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
