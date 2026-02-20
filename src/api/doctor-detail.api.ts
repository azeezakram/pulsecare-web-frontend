import api from "./axios";
import type { DoctorDetailReq, DoctorDetailRes } from "../features/doctor-detail/type";
import type { ResponseBody } from "../common/res-template";
import axios from "axios";

const BASE_URL = "/doctor-detail";

export const fetchAllDoctorDetails = async (): Promise<DoctorDetailRes[]> => {
  const res = await api.get<ResponseBody<DoctorDetailRes[]>>(BASE_URL);
  return res.data.data || [];
};

export const fetchDoctorDetailById = async (id: number): Promise<DoctorDetailRes> => {
  const res = await api.get<ResponseBody<DoctorDetailRes>>(`${BASE_URL}/${id}`);
  return res.data.data;
};

export const fetchDoctorDetailByUserId = async (
  userId: string
): Promise<DoctorDetailRes | null> => {
  try {
    const res = await api.get<ResponseBody<DoctorDetailRes>>(`${BASE_URL}/by-user/${userId}`);
    return res.data.data ?? null;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
};


export const createDoctorDetail = async (data: DoctorDetailReq): Promise<DoctorDetailRes> => {
  const res = await api.post<ResponseBody<DoctorDetailRes>>(BASE_URL, data);
  return res.data.data;
};

export const updateDoctorDetail = async (userId: string, data: DoctorDetailReq): Promise<DoctorDetailRes> => {
  const res = await api.put<ResponseBody<DoctorDetailRes>>(`${BASE_URL}/${userId}`, data);
  return res.data.data;
};

export const deleteDoctorDetail = async (id: number): Promise<void> => {
  await api.delete<ResponseBody<string>>(`${BASE_URL}/${id}`);
};