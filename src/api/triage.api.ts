import type { ResponseBody } from "../common/res-template";
import type { TriageReq, TriageRes } from "../features/triage/types";
import api from "./axios";

const BASE = '/triage';

export async function fetchAllTriage(): Promise<TriageRes[]> {
  const res = await api.get<ResponseBody<TriageRes[]>>(BASE);
  return res.data.data;
}

export async function fetchTriageById(id: number): Promise<TriageRes> {
  const res = await api.get<ResponseBody<TriageRes>>(`${BASE}/${id}`);
  return res.data.data;
}

export async function createTriage(data: TriageReq): Promise<TriageRes> {
  const res = await api.post<ResponseBody<TriageRes>>(BASE, data);
  return res.data.data;
}

export async function predictTriage(data: TriageReq): Promise<TriageRes> {
  const res = await api.post<ResponseBody<TriageRes>>(`${BASE}/predict`, data);
  return res.data.data;
}

export async function updateTriage(id: number, data: TriageReq): Promise<TriageRes> {
  const res = await api.put<ResponseBody<TriageRes>>(`${BASE}/${id}`, data);
  return res.data.data;
}

export async function deleteTriage(id: number): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}