import api from "./axios";
import type { ResponseBody } from "../common/res-template";
import type { WardReq, WardRes } from "../features/ward/types";

const BASE_URL = "/ward";

export const fetchAllWards = async (): Promise<WardRes[]> => {
  const res = await api.get<ResponseBody<WardRes[]>>(BASE_URL);
  return res.data.data;
};

export const fetchWardById = async (id: number): Promise<WardRes> => {
  const res = await api.get<ResponseBody<WardRes>>(`${BASE_URL}/${id}`);
  return res.data.data;
};

export const fetchWardsByDepartmentId = async (departmentId: number): Promise<WardRes[]> => {
  const res = await api.get<ResponseBody<WardRes[]>>(`${BASE_URL}/by-department`, {
    params: { dep: departmentId },
  });
  return res.data.data;
};

export const createWard = async (payload: WardReq): Promise<WardRes> => {
  const res = await api.post<ResponseBody<WardRes>>(BASE_URL, payload);
  return res.data.data;
};

export const updateWard = async (id: number, payload: WardReq): Promise<WardRes> => {
  const res = await api.put<ResponseBody<WardRes>>(`${BASE_URL}/${id}`, payload);
  return res.data.data;
};

export const deleteWard = async (id: number): Promise<void> => {
  await api.delete<ResponseBody<string>>(`${BASE_URL}/${id}`);
};
