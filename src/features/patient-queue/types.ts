export type QueuePriority = "CRITICAL" | "NON_CRITICAL" | "NORMAL";
export type QueueStatus = "WAITING" | "ADMITTED" | "CANCELLED" | "OUTPATIENT";

export interface PatientQueueReq {
  patientId?: number;
  triageId?: number;
  priority?: QueuePriority;
  status?: QueueStatus;
}

export interface PatientQueueRes {
  id: number;
  patientName?: string;
  patientId?: number;
  triageId?: number;
  triageLevel?: number;
  status?: QueueStatus;
  priority?: QueuePriority;
  admitted?: boolean;
  createdAt: string;
}
