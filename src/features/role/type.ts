export interface RoleRes {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleReq {
  name: string;
}

export type Role = "ADMIN" | "DOCTOR" | "NURSE";

