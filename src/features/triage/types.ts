export interface TriageReq {
  patientId: number;
  sex: number;
  arrivalMode: number;
  injury: number;
  mental: number;
  pain: number;
  age: number;
  sbp: number;
  dbp: number;
  hr: number;
  rr: number;
  bt: number;
}

export interface TriageRes {
  id: number;
  patientId: number;
  sex: number;
  arrivalMode: number;
  injury: number;
  mental: number;
  pain: number;
  age: number;
  sbp: number;
  dbp: number;
  hr: number;
  rr: number;
  bt: number;
  shockIndex?: number;
  pulsePressure?: number;
  ppRatio?: number;
  hrBtInteraction?: number;
  rrHrRatio?: number;
  isFever?: boolean;
  isTachy?: boolean;
  isLowSbp?: boolean;
  isLowDbp?: boolean;
  isTachypnea?: boolean;
  triageLevel?: number;
  severity?: string;
  createdAt: string;
  updatedAt: string;
}
