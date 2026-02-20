import api from "./axios";
import type { ResponseBody } from "../common/res-template";
import type { BedReq, BedRes } from "../features/bed/types";

const BASE_URL = "/bed";

export const fetchAllBeds = async (): Promise<BedRes[]> => {
  const res = await api.get<ResponseBody<BedRes[]>>(BASE_URL);
  return res.data.data;
};

export const fetchBedById = async (id: number): Promise<BedRes> => {
  const res = await api.get<ResponseBody<BedRes>>(`${BASE_URL}/${id}`);
  return res.data.data;
};

export const fetchBedByBedNoAndWardId = async (wardId: number, bedNo: string): Promise<BedRes> => {
  const res = await api.get<ResponseBody<BedRes>>(`${BASE_URL}/by-bedno-wardid`, {
    params: { wardId, bedNo },
  });
  return res.data.data;
};

export const createBed = async (payload: BedReq): Promise<BedRes> => {
  const res = await api.post<ResponseBody<BedRes>>(BASE_URL, payload);
  return res.data.data;
};

export const batchCreateBeds = async (wardId: number, payload: BedReq[]): Promise<BedRes[]> => {
  const res = await api.post<ResponseBody<BedRes[]>>(`${BASE_URL}/batch/${wardId}`, payload);
  return res.data.data;
};

export const updateBed = async (id: number, payload: BedReq): Promise<BedRes> => {
  const res = await api.put<ResponseBody<BedRes>>(`${BASE_URL}/${id}`, payload);
  return res.data.data;
};

export const deleteBed = async (id: number): Promise<void> => {
  await api.delete<ResponseBody<string>>(`${BASE_URL}/${id}`);
};
