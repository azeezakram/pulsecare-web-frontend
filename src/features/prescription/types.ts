export type PrescriptionType = "OPD" | "IPD";
export type PrescriptionStatus = "DRAFT" | "FINALIZED" | "DISPENSED";

export interface PrescriptionItemReq {
  id?: number;
  prescriptionId?: number;
  medicineName?: string;
  dosage?: string;
  frequency?: string;
  durationDays?: number;
  instructions?: string;
}

export interface PrescriptionReq {
  doctorId?: string;
  queueId?: number;
  admissionId?: number;
  type?: PrescriptionType;
  notes?: string;
  items?: PrescriptionItemReq[];
}

export interface PrescriptionItemRes {
  id: number;
  prescriptionId?: number;
  medicineName?: string;
  dosage?: string;
  frequency?: string;
  durationDays?: number;
  instructions?: string;
}

export interface PrescriptionDetailRes {
  id: number;
  doctorName?: string;
  admissionId?: number;
  queueId?: number;
  type?: PrescriptionType;
  notes?: string;
  status?: PrescriptionStatus;
  items?: PrescriptionItemRes[];
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionSummaryRes {
  id: number;
  doctorName?: string;
  admissionId?: number;
  queueId?: number;
  type?: PrescriptionType;
  notes?: string;
  status?: PrescriptionStatus;
  createdAt: string;
  updatedAt: string;
}
