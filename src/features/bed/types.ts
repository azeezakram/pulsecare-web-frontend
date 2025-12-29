export interface BedReq {
  bedNo?: string;
  isTaken?: boolean;
  wardId?: number;
}

export interface BedRes {
  id: number;
  bedNo?: string;
  isTaken?: boolean;
  wardId?: number;
  createdAt: string;
  updatedAt: string;
}
