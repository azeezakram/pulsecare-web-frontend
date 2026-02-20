
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import LoginPage from "../pages/LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import RequireRole from "./RequireRole";

import AdminHomePage from "../pages/admin/AdminHomePage";
import AdminPatientAdmissionPage from "../pages/admin/patient-admission-management/AdminPatientAdmissionPage";
import AdminDepartmentPage from "../pages/admin/department-management/AdminDepartmentPage";
import AdminSettingPage from "../pages/admin/settings/AdminSettingPage";
import AdminUsersPage from "../pages/admin/user-management/AdminUsersPage";
import { useAuthStore } from "../store/auth-store";

import NurseDepartmentPage from "../pages/nurse/NurseDepartmentPage";
import NurseHomePage from "../pages/nurse/NurseHomePage";
import NurseProfilePage from "../pages/nurse/NurseProfilePage";
import NurseSettingPage from "../pages/nurse/NurseSettingPage";
import NurseTriagePage from "../pages/nurse/NurseTriagePage";
import NursePatientAdmissionPage from "../pages/nurse/patient-admission/NursePatientAdmissionPage";

import DoctorHomePage from "../pages/doctor/DoctorHomePage";
import DoctorPatientQueuePage from "../pages/doctor/DoctorPatientQueuePage";
import DoctorProfilePage from "../pages/doctor/DoctorProfilePage";
import DoctorSettingPage from "../pages/doctor/DoctorSettingPage";
import DoctorTriagePage from "../pages/doctor/DoctorTriagePage";
import DoctorPatientsAdmissionPage from "../pages/doctor/patient-admission/DoctorPatientsAdmissionPage";

import AdminPatientQueuePage from "../pages/admin/AdminPatientQueuePage";
import AdminTriageAiHistoryPage from "../pages/admin/AdminTriageAiHistoryPage";
import AdminDepartmentDetailsPage from "../pages/admin/department-management/AdminDepartmentDetailsPage";
import AdminPatientCreatePage from "../pages/admin/patient-management/AdminPatientCreatePage";
import AdminPatientDetailsPage from "../pages/admin/patient-management/AdminPatientDetailsPage";
import AdminPatientManagementPage from "../pages/admin/patient-management/AdminPatientManagementPage";
import AdminPatientUpdatePage from "../pages/admin/patient-management/AdminPatientUpdatePage";
import AdminProfilePage from "../pages/admin/settings/AdminProfilePage";
import AdminCreateUserPage from "../pages/admin/user-management/AdminCreateUserPage";
import AdminUserDetailsPage from "../pages/admin/user-management/AdminUserDetailsPage";
import AdminUpdateUserPage from "../pages/admin/user-management/AdminUserUpdatePage";
import DoctorAdmissionDetailsPage from "../pages/doctor/patient-admission/DoctorPatientsAdmissionDetailsPage";
import NursePatientQueuePage from "../pages/nurse/NursePatientQueuePage";
import NursePatientAdmissionCreatePage from "../pages/nurse/patient-admission/NursePatientAdmissionCreatePage";
import NursePatientCreatePage from "../pages/nurse/patient-management/NursePatientCreatPage";
import NursePatientDetailsPage from "../pages/nurse/patient-management/NursePatientDetailsPage";
import NursePatientEditPage from "../pages/nurse/patient-management/NursePatientEditPage";
import NursePatientManagementPage from "../pages/nurse/patient-management/NursePatientManagementPage";
import { AdminEditAdmissionPage } from "../pages/admin/patient-admission-management/AdminEditAdmissionPage";

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

          <Route path="admin/patients" element={<RequireRole roles={ADMIN_ROLES}><AdminPatientManagementPage /></RequireRole>} />
          <Route path="admin/patients/new" element={<RequireRole roles={ADMIN_ROLES}><AdminPatientCreatePage /></RequireRole>} />
          <Route path="admin/patients/:id/edit" element={<RequireRole roles={ADMIN_ROLES}><AdminPatientUpdatePage /></RequireRole>} />
          <Route path="admin/patients/:id" element={<RequireRole roles={ADMIN_ROLES}><AdminPatientDetailsPage /></RequireRole>} />

          <Route path="admin/patient-queue" element={<RequireRole roles={ADMIN_ROLES}><AdminPatientQueuePage /></RequireRole>} />

          <Route path="admin/patient-addmissions" element={<RequireRole roles={ADMIN_ROLES}><AdminPatientAdmissionPage /></RequireRole>} />
          <Route path="admin/patient-addmissions/:id/edit" element={<AdminEditAdmissionPage />} />

          <Route path="admin/triage" element={<RequireRole roles={ADMIN_ROLES}><AdminTriageAiHistoryPage /></RequireRole>} />

          <Route path="admin/departments" element={<RequireRole roles={ADMIN_ROLES}><AdminDepartmentPage /></RequireRole>} />
          <Route path="admin/departments/:id" element={<RequireRole roles={ADMIN_ROLES}><AdminDepartmentDetailsPage /></RequireRole>} />
          

          <Route path="admin/settings/profile" element={<RequireRole roles={ADMIN_ROLES}><AdminProfilePage /></RequireRole>} />
          <Route path="admin/settings" element={<RequireRole roles={ADMIN_ROLES}><AdminSettingPage /></RequireRole>} />

          <Route path="nurse/home" element={<RequireRole roles={NURSE_ROLES}><NurseHomePage /></RequireRole>} />
          <Route path="nurse/triage" element={<RequireRole roles={NURSE_ROLES}><NurseTriagePage /></RequireRole>} />
          <Route path="nurse/departments" element={<RequireRole roles={NURSE_ROLES}><NurseDepartmentPage /></RequireRole>} />

          <Route path="nurse/patients" element={<RequireRole roles={NURSE_ROLES}><NursePatientManagementPage /></RequireRole>} />
          <Route path="nurse/patients/new" element={<RequireRole roles={NURSE_ROLES}><NursePatientCreatePage /></RequireRole>} />
          <Route path="nurse/patients/:id/edit" element={<RequireRole roles={NURSE_ROLES}><NursePatientEditPage /></RequireRole>} />
          <Route path="nurse/patients/:id" element={<RequireRole roles={NURSE_ROLES}><NursePatientDetailsPage /></RequireRole>} />
          
          <Route path="nurse/patient-queue" element={<RequireRole roles={NURSE_ROLES}><NursePatientQueuePage /></RequireRole>} />

          <Route path="nurse/patient-addmissions" element={<RequireRole roles={NURSE_ROLES}><NursePatientAdmissionPage /></RequireRole>} />
          <Route path="nurse/patient-addmissions/new" element={<RequireRole roles={NURSE_ROLES}><NursePatientAdmissionCreatePage /></RequireRole>} />

          <Route path="nurse/settings/profile" element={<RequireRole roles={NURSE_ROLES}><NurseProfilePage /></RequireRole>} />
          <Route path="nurse/settings" element={<RequireRole roles={NURSE_ROLES}><NurseSettingPage /></RequireRole>} />

          <Route path="doctor/home" element={<RequireRole roles={DOCTOR_ROLES}><DoctorHomePage /></RequireRole>} />
          <Route path="doctor/patient-queue" element={<RequireRole roles={DOCTOR_ROLES}><DoctorPatientQueuePage /></RequireRole>} />
          <Route path="doctor/patient-admission" element={<RequireRole roles={DOCTOR_ROLES}><DoctorPatientsAdmissionPage /></RequireRole>} />
          <Route path="doctor/patient-admission/:id" element={<RequireRole roles={DOCTOR_ROLES}><DoctorAdmissionDetailsPage /></RequireRole>} />
          <Route path="doctor/triage" element={<RequireRole roles={DOCTOR_ROLES}><DoctorTriagePage /></RequireRole>} />
          <Route path="doctor/settings/profile" element={<RequireRole roles={DOCTOR_ROLES}><DoctorProfilePage /></RequireRole>} />
          <Route path="doctor/settings" element={<RequireRole roles={DOCTOR_ROLES}><DoctorSettingPage /></RequireRole>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
