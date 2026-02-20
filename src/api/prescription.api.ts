// src/api/prescription.api.ts
import api from "./axios";
import type { ResponseBody } from "../common/res-template";
import type {
  PrescriptionReq,
  PrescriptionSummaryRes,
  PrescriptionDetailRes,
} from "../features/prescription/types";

const BASE_URL = "/prescription";

export const prescriptionApi = {
  async findAll(): Promise<PrescriptionSummaryRes[]> {
    const res = await api.get<ResponseBody<PrescriptionSummaryRes[]>>(BASE_URL);
    return res.data.data;
  },

  async findById(id: number): Promise<PrescriptionSummaryRes> {
    const res = await api.get<ResponseBody<PrescriptionSummaryRes>>(`${BASE_URL}/${id}`);
    return res.data.data;
  },

  async findWithDetailById(id: number): Promise<PrescriptionDetailRes> {
    const res = await api.get<ResponseBody<PrescriptionDetailRes>>(`${BASE_URL}/d/${id}`);
    return res.data.data;
  },

  async findAllDetailByAdmissionId(id: number): Promise<PrescriptionDetailRes[]> {
    const res = await api.get<ResponseBody<PrescriptionDetailRes[]>>(`${BASE_URL}/by-admission/${id}`);
    return res.data.data;
  },

  async create(payload: PrescriptionReq): Promise<PrescriptionDetailRes> {
    const res = await api.post<ResponseBody<PrescriptionDetailRes>>(BASE_URL, payload);
    return res.data.data;
  },

  async update(id: number, payload: PrescriptionReq): Promise<PrescriptionDetailRes> {
    const res = await api.put<ResponseBody<PrescriptionDetailRes>>(`${BASE_URL}/${id}`, payload);
    return res.data.data;
  },

  async remove(id: number): Promise<void> {
    await api.delete<ResponseBody<string>>(`${BASE_URL}/${id}`);
  },
};
