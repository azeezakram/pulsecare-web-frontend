import {
  BrainCircuit,
  Building2,
  ClipboardList,
  LayoutDashboard,
  ListOrdered,
  Logs,
  Settings,
  Users
} from "lucide-react";

export type MenuItem = {
  label: string;
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
};

export const ADMIN_MENU: MenuItem[] = [
  { label: "Dashboard", path: "/dashboard/admin/home", icon: LayoutDashboard },
  { label: "User Management", path: "/dashboard/admin/users", icon: Users },
  { label: "Patient Management", path: "/dashboard/admin/patients", icon: ClipboardList },
  { label: "Patient Queue Management", path: "/dashboard/admin/patient-queue", icon: ListOrdered },
  { label: "Patient Admission Management", path: "/dashboard/admin/patient-addmissions", icon: ClipboardList },
  { label: "Triage AI History", path: "/dashboard/admin/triage", icon: BrainCircuit },
  { label: "Departments Management", path: "/dashboard/admin/departments", icon: Building2 },
  { label: "Settings", path: "/dashboard/admin/settings", icon: Settings },
];


export const DOCTOR_MENU: MenuItem[] = [
  { label: "Dashboard", path: "/dashboard/doctor/home", icon: LayoutDashboard },
  { label: "Triage AI", path: "/dashboard/doctor/triage", icon: BrainCircuit },
  { label: "Patient Queue", path: "/dashboard/doctor/patient-queue", icon: ListOrdered },
  { label: "Patient Admissions", path: "/dashboard/doctor/patient-admission", icon: Logs },
  { label: "Settings", path: "/dashboard/doctor/settings", icon: Settings },
];


export const NURSE_MENU: MenuItem[] = [
  { label: "Dashboard", path: "/dashboard/nurse/home", icon: LayoutDashboard },
  { label: "Triage AI", path: "/dashboard/nurse/triage", icon: BrainCircuit },
  { label: "Patients Management", path: "/dashboard/nurse/patients", icon: ClipboardList },
  { label: "Patient Queue Management", path: "/dashboard/nurse/patient-queue", icon: ListOrdered },
  { label: "Patient Admission Management", path: "/dashboard/nurse/patient-addmissions", icon: ClipboardList },
  { label: "View Departments", path: "/dashboard/nurse/departments", icon: Building2 },
  { label: "Settings", path: "/dashboard/nurse/settings", icon: Settings },
];

export const MENU_BY_ROLE: Record<string, MenuItem[]> = {
  ADMIN: ADMIN_MENU,
  SUPER_ADMIN: ADMIN_MENU,
  
  DOCTOR: DOCTOR_MENU,
  SUPER_DOCTOR: DOCTOR_MENU,
  
  NURSE: NURSE_MENU,
  SUPER_NURSE: NURSE_MENU,
};
