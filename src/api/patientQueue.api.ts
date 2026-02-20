import api from "./axios";
import type { ResponseBody } from "../common/res-template";
import type { PatientQueueReq, PatientQueueRes } from "../features/patient-queue/types";

const BASE_URL = "/patient-queue";

export const patientQueueApi = {
  async findAll(): Promise<PatientQueueRes[]> {
    const res = await api.get<ResponseBody<PatientQueueRes[]>>(BASE_URL);
    return res.data.data;
  },

  async findById(id: number): Promise<PatientQueueRes> {
    const res = await api.get<ResponseBody<PatientQueueRes>>(`${BASE_URL}/${id}`);
    return res.data.data;
  },

  async create(payload: PatientQueueReq): Promise<PatientQueueRes> {
    const res = await api.post<ResponseBody<PatientQueueRes>>(BASE_URL, payload);
    return res.data.data;
  },

  async update(id: number, payload: PatientQueueReq): Promise<PatientQueueRes> {
    const res = await api.put<ResponseBody<PatientQueueRes>>(`${BASE_URL}/${id}`, payload);
    return res.data.data;
  },

  async remove(id: number): Promise<void> {
    await api.delete<ResponseBody<string>>(`${BASE_URL}/${id}`);
  },
};
