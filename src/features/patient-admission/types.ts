export type PatientAdmissionStatus = "ACTIVE" | "DISCHARGED" | "TRANSFERRED";

export interface PatientAdmissionReq {
  patientId?: number;
  queueId?: number;
  bedId?: number;
  status?: PatientAdmissionStatus;
  dischargeNotes?: string;
}

export interface PatientAdmissionRes {
  id: number;
  patientId?: number;
  patientName?: string;
  queueId?: number;
  wardId?: number;
  wardName?: string;
  bedId?: number;
  status?: PatientAdmissionStatus | string;
  admittedAt?: string;
  dischargedAt?: string;
  dischargeNotes?: string;
}
