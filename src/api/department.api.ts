// src/api/department.api.ts
import api from "./axios";
import type { ResponseBody } from "../common/res-template";
import type { DeptReq, DeptRes } from "../features/department/types";

const BASE_URL = "/department";

export const fetchAllDepartments = async (): Promise<DeptRes[]> => {
  const res = await api.get<ResponseBody<DeptRes[]>>(BASE_URL);
  return res.data.data;
};

export const fetchDepartmentById = async (id: number): Promise<DeptRes> => {
  const res = await api.get<ResponseBody<DeptRes>>(`${BASE_URL}/${id}`);
  return res.data.data;
};

export const createDepartment = async (payload: DeptReq): Promise<DeptRes> => {
  const res = await api.post<ResponseBody<DeptRes>>(BASE_URL, payload);
  return res.data.data;
};

export const updateDepartment = async (id: number, payload: DeptReq): Promise<DeptRes> => {
  const res = await api.put<ResponseBody<DeptRes>>(`${BASE_URL}/${id}`, payload);
  return res.data.data;
};

export const deleteDepartment = async (id: number): Promise<void> => {
  await api.delete<ResponseBody<string>>(`${BASE_URL}/${id}`);
};
