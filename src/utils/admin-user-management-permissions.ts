// src/utils/user-permissions.ts
export const PROTECTED_ROLES = new Set(["SUPER_ADMIN"]);
export const SUPER_STAFF_ROLES = new Set(["SUPER_DOCTOR", "SUPER_NURSE"]); // only SUPER_ADMIN can manage

export function canEditUser(currentRole?: string, targetRole?: string) {
  const me = (currentRole || "").toUpperCase();
  const target = (targetRole || "").toUpperCase();

  if (PROTECTED_ROLES.has(target)) return false; // super admin not editable
  if (SUPER_STAFF_ROLES.has(target)) return me === "SUPER_ADMIN"; // only super admin can edit super staff
  return true;
}

export function canDeleteUser(currentRole?: string, targetRole?: string) {
  const me = (currentRole || "").toUpperCase();
  const target = (targetRole || "").toUpperCase();

  if (PROTECTED_ROLES.has(target)) return false; // super admin not deletable
  if (SUPER_STAFF_ROLES.has(target)) return me === "SUPER_ADMIN";
  return true;
}
