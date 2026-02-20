export interface PatientReq {
  fullName?: string;
  dob?: string;
  bloodGroup?: string;
  nic?: string;
  gender?: string;
  phone?: string;
  isActive?:boolean;
}

export interface PatientRes {
  id: number;
  fullName?: string;
  dob?: string;
  bloodGroup?: string;
  nic?: string;
  gender?: string;
  phone?: string;
  isActive?:boolean;
  createdAt: string;
}
