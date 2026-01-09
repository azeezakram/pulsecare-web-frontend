import {
  LayoutDashboard,
  ListOrdered,
  Users,
  BrainCircuit,
  Stethoscope,
  Logs,
  Building2,
  ClipboardList,
  Settings
} from "lucide-react";
import type { Role } from "../../features/role/type";

export type MenuItem = {
  label: string;
  path: string;
  icon: any;
};

export const ADMIN_MENU: MenuItem[] = [
  { label: "Dashboard", path: "/dashboard/admin/home", icon: LayoutDashboard },
  { label: "User Management", path: "/dashboard/admin/users", icon: Users },
  { label: "Doctor Management", path: "/dashboard/admin/doctors", icon: Stethoscope },
  { label: "Patient Management", path: "/dashboard/admin/patients", icon: ClipboardList },
  { label: "Patient Admission Management", path: "/dashboard/admin/patient-addmissions", icon: ClipboardList },
  { label: "Departments Management", path: "/dashboard/admin/departments", icon: Building2 },
  { label: "Settings", path: "/dashboard/admin/settings", icon: Settings },
];


export const DOCTOR_MENU: MenuItem[] = [
  { label: "Dashboard", path: "/dashboard/doctor/home", icon: LayoutDashboard },
  { label: "Triage AI", path: "/dashboard/doctor/triage", icon: BrainCircuit },
  { label: "Patient Queue", path: "/dashboard/doctor/patient-queue", icon: ListOrdered },
  { label: "Patient Admission Logs", path: "/dashboard/doctor/patient-admission", icon: Logs },
  { label: "Treatment Log Management", path: "/dashboard/doctor/patient-treatment-log", icon: Logs },
  { label: "Settings", path: "/dashboard/doctor/settings", icon: Settings },
];


export const NURSE_MENU: MenuItem[] = [
  { label: "Dashboard", path: "/dashboard/nurse/home", icon: LayoutDashboard },
  { label: "Triage AI", path: "/dashboard/nurse/triage", icon: BrainCircuit },
  { label: "Doctors", path: "/dashboard/nurse/doctors", icon: Stethoscope },
  { label: "Departments", path: "/dashboard/nurse/departments", icon: Building2 },
  { label: "Patients", path: "/dashboard/nurse/patients", icon: ClipboardList },
  { label: "Admissions", path: "/dashboard/nurse/patient-addmissions", icon: ClipboardList },
  { label: "Settings", path: "/dashboard/nurse/settings", icon: Settings },
];


export const MENU_BY_ROLE: Record<Role, MenuItem[]> = {
  ADMIN: ADMIN_MENU,
  DOCTOR: DOCTOR_MENU,
  NURSE: NURSE_MENU,
};
