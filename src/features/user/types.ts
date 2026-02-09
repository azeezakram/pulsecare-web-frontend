export interface UserReq {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string | null;
  password?: string;
  mobileNumber?: string | null;
  roleId?: number;
  isActive?: boolean;
}


import type { RoleRes } from "../role/type";

export interface UserRes {
  id: string;                  
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
  mobileNumber?: string;
  role: RoleRes;
  imageUrl?: string; 
  createdAt: string;           
  updatedAt: string;          
  lastLoginAt?: string;       
  isActive: boolean;
}
