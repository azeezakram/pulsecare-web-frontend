import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import RequireRole from "./RequireRole";
import PublicRoute from "./PublicRoute";
import DashboardPage from "../pages/DashboardPage";

import AdminHomePage from "../pages/admin/AdminHomePage";
import AdminUsersPage from "../pages/admin/AdminUsersPage";
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
import DoctorHomePage from "../pages/doctor/DoctorHomePage";
import DoctorPatientQueuePage from "../pages/doctor/DoctorPatientQueuePage";
import DoctorPatientsAdmissionPage from "../pages/doctor/DoctorPatientsAdmissionPage";
import DoctorProfilePage from "../pages/doctor/DoctorProfilePage";
import NurseSettingPage from "../pages/nurse/NurseSettingPage";
import DoctorSettingPage from "../pages/doctor/DoctorSettingPage";
import DoctorPatientTreatmentLogPage from "../pages/doctor/DoctorPatientTreatmentLogPage";
import DoctorTriagePage from "../pages/doctor/DoctorTriagePage";
import AdminBedPage from "../pages/admin/AdminBedPage";
import AdminProfilePage from "../pages/admin/AdminProfilePage";

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

        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage/></ProtectedRoute>}>
          <Route index element={<Navigate to={`/dashboard/${role}/home`} replace />}/>

<<<<<<< HEAD
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
=======
          {/* ADMIN */}
          <Route path="admin/home" element={<RequireRole role="ADMIN"><AdminHomePage/></RequireRole>} />
          <Route path="admin/users" element={<RequireRole role="ADMIN"><AdminUsersPage/></RequireRole>} />
          <Route path="admin/doctors" element={<RequireRole role="ADMIN"><AdminDoctorPage/></RequireRole>} />
          <Route path="admin/departments" element={<RequireRole role="ADMIN"><AdminDepartmentPage/></RequireRole>} />
          <Route path="admin/patients" element={<RequireRole role="ADMIN"><AdminPatientsPage/></RequireRole>} />
          <Route path="admin/patient-addmissions" element={<RequireRole role="ADMIN"><AdminPatientAdmissionPage/></RequireRole>} />
          <Route path="admin/departments/wards" element={<RequireRole role="ADMIN"><AdminWardPage/></RequireRole>} />
          <Route path="admin/departments/wards/beds" element={<RequireRole role="ADMIN"><AdminBedPage/></RequireRole>} />
          <Route path="admin/settings/profile" element={<RequireRole role="ADMIN"><AdminProfilePage/></RequireRole>} />
          <Route path="admin/settings" element={<RequireRole role="ADMIN"><AdminSettingPage/></RequireRole>} />

          {/* NURSE */}
          <Route path="nurse/home" element={<RequireRole role="NURSE"><NurseHomePage/></RequireRole>} />
          <Route path="nurse/triage" element={<RequireRole role="NURSE"><NurseTriagePage/></RequireRole>} />
          <Route path="nurse/doctors" element={<RequireRole role="NURSE"><NurseDoctorPage/></RequireRole>} />
          <Route path="nurse/departments" element={<RequireRole role="NURSE"><NurseDepartmentPage/></RequireRole>} />
          <Route path="nurse/patients" element={<RequireRole role="NURSE"><NursePatientsPage/></RequireRole>} />
          <Route path="nurse/patient-addmissions" element={<RequireRole role="NURSE"><NursePatientAdmissionPage/></RequireRole>} />
          <Route path="nurse/departments/wards" element={<RequireRole role="NURSE"><NurseWardPage/></RequireRole>} />
          <Route path="nurse/departments/wards/beds" element={<RequireRole role="NURSE"><NurseBedPage/></RequireRole>} />
          <Route path="nurse/settings/profile" element={<RequireRole role="NURSE"><NurseProfilePage/></RequireRole>} />
          <Route path="nurse/settings" element={<RequireRole role="NURSE"><NurseSettingPage/></RequireRole>} />

          {/* DOCTOR */}
          <Route path="doctor/home" element={<RequireRole role="DOCTOR"><DoctorHomePage/></RequireRole>} />
          <Route path="doctor/patient-queue" element={<RequireRole role="DOCTOR"><DoctorPatientQueuePage/></RequireRole>} />
          <Route path="doctor/patient-admission" element={<RequireRole role="DOCTOR"><DoctorPatientsAdmissionPage/></RequireRole>} />
          <Route path="doctor/patient-treatment-log" element={<RequireRole role="DOCTOR"><DoctorPatientTreatmentLogPage/></RequireRole>} />
          <Route path="doctor/triage" element={<RequireRole role="DOCTOR"><DoctorTriagePage/></RequireRole>} />
          <Route path="doctor/settings/profile" element={<RequireRole role="DOCTOR"><DoctorProfilePage/></RequireRole>} />
          <Route path="doctor/settings" element={<RequireRole role="DOCTOR"><DoctorSettingPage/></RequireRole>} />
          
        </Route>
>>>>>>> v2


        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
