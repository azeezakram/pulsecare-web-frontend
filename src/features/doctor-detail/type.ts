import type { SpecializationRes } from "../specialization/type";

export interface DoctorDetailReq {
  licenseNo?: string;
  userId?: string;
  specializationIds?: number[];
}

export interface DoctorDetailRes {
  id: number;
  licenseNo?: string;
  userId?: string;
  specializations?: SpecializationRes[];
}