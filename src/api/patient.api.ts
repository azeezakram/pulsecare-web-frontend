import api from "./axios";
import type { ResponseBody } from "../common/res-template";
import type { PatientRes, PatientReq } from './../features/patient/types';

const BASE_URL = "/patient";

export const patientApi = {
  async findAll(): Promise<PatientRes[]> {
    const res = await api.get<ResponseBody<PatientRes[]>>(BASE_URL);
    return res.data.data;
  },

  async findById(id: number): Promise<PatientRes> {
    const res = await api.get<ResponseBody<PatientRes>>(`${BASE_URL}/${id}`);
    return res.data.data;
  },

  async findByNic(nic: string): Promise<PatientRes> {
    const res = await api.get<ResponseBody<PatientRes>>(`${BASE_URL}/nic/${encodeURIComponent(nic)}`);
    return res.data.data;
  },

  async findActiveAll(): Promise<PatientRes[]> {
    const res = await api.get<ResponseBody<PatientRes[]>>(`${BASE_URL}/active`);
    return res.data.data;
  },

  async findActiveById(id: number): Promise<PatientRes> {
    const res = await api.get<ResponseBody<PatientRes>>(`${BASE_URL}/active/${id}`);
    return res.data.data;
  },

  async findActiveByNic(nic: string): Promise<PatientRes> {
    const res = await api.get<ResponseBody<PatientRes>>(`${BASE_URL}/nic/active/${encodeURIComponent(nic)}`);
    return res.data.data;
  },

  async create(payload: PatientReq): Promise<PatientRes> {
    const res = await api.post<ResponseBody<PatientRes>>(BASE_URL, payload);
    return res.data.data;
  },

  async update(id: number, payload: PatientReq): Promise<PatientRes> {
    const res = await api.put<ResponseBody<PatientRes>>(`${BASE_URL}/${id}`, payload);
    return res.data.data;
  },

  async remove(id: number): Promise<void> {
    await api.delete<ResponseBody<string>>(`${BASE_URL}/${id}`);
  },
};