export interface WardReq {
  name?: string;
  departmentId?: number;
  bedCount?: number;
  occupiedBeds?: number;
}

export interface WardRes {
  id: number;
  name?: string;
  departmentId?: number;
  bedCount?: number;
  occupiedBeds?: number;
  createdAt: string;
  updatedAt: string;
}
