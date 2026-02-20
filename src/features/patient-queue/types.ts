export type QueuePriority = "CRITICAL" | "NON_CRITICAL" | "NORMAL";
export type QueueStatus = "WAITING" | "ADMITTED" | "CANCELLED" | "OUTPATIENT";

export interface PatientQueueReq {
  patientId?: number;
  triageId?: number;
  priority?: QueuePriority;
  status?: QueueStatus;
  admitted?: boolean | false;
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

export type PatientQueueEvent = {
  type: "QUEUE_CREATED" | "QUEUE_UPDATED" | "QUEUE_DELETED";
  queueId: number;
  payload: PatientQueueRes | null;
  sentAt: string;
};

