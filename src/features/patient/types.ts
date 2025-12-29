export interface PatientReq {
  fullName?: string;
  dob?: string;
  bloodGroup?: string;
  nic?: string;
  gender?: string;
  phone?: string;
}

export interface PatientRes {
  id: number;
  fullName?: string;
  dob?: string;
  bloodGroup?: string;
  nic?: string;
  gender?: string;
  phone?: string;
  createdAt: string;
}
