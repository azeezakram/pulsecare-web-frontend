import api from "./axios";
import type { ResponseBody } from "../common/res-template";
import type { PatientAdmissionReq, PatientAdmissionRes } from "../features/patient-admission/types";

const BASE_URL = "/patient-admission";

export const patientAdmissionApi = {
  async findAll(): Promise<PatientAdmissionRes[]> {
    const res = await api.get<ResponseBody<PatientAdmissionRes[]>>(BASE_URL);
    return res.data.data;
  },

  async findById(id: number): Promise<PatientAdmissionRes> {
    const res = await api.get<ResponseBody<PatientAdmissionRes>>(`${BASE_URL}/${id}`);
    return res.data.data;
  },

  async create(payload: PatientAdmissionReq): Promise<PatientAdmissionRes> {
    const res = await api.post<ResponseBody<PatientAdmissionRes>>(BASE_URL, payload);
    return res.data.data;
  },

  async update(id: number, payload: PatientAdmissionReq): Promise<PatientAdmissionRes> {
    const res = await api.put<ResponseBody<PatientAdmissionRes>>(`${BASE_URL}/${id}`, payload);
    return res.data.data;
  },

  async remove(id: number): Promise<void> {
    await api.delete<ResponseBody<string>>(`${BASE_URL}/${id}`);
  },

  async hasActiveAdmission(id: number): Promise<boolean> {
    const res = await api.get<ResponseBody<boolean>>(`${BASE_URL}/hasActive/${id}`);
    return Boolean(res.data.data);
  }
};
