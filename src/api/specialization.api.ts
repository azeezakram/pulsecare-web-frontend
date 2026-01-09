import api from "./axios"; // Using the centralized axios instance we discussed
import type { SpecializationRes, SpecializationReq } from "../features/specialization/type";
import type { ResponseBody } from "../common/res-template";

const BASE_URL = "/specialization";

export const fetchAllSpecializations = async (): Promise<SpecializationRes[]> => {
    const res = await api.get<ResponseBody<SpecializationRes[]>>(BASE_URL);
    return res.data.data || [];
};

export const fetchSpecializationById = async (id: number): Promise<SpecializationRes> => {
    const res = await api.get<ResponseBody<SpecializationRes>>(`${BASE_URL}/${id}`);
    return res.data.data;
};

export const createSpecialization = async (data: SpecializationReq): Promise<SpecializationRes> => {
    const res = await api.post<ResponseBody<SpecializationRes>>(BASE_URL, data);
    return res.data.data;
};

export const updateSpecialization = async (id: number, data: SpecializationReq): Promise<SpecializationRes> => {
    const res = await api.put<ResponseBody<SpecializationRes>>(`${BASE_URL}/${id}`, data);
    return res.data.data;
};

export const deleteSpecialization = async (id: number): Promise<void> => {
    await api.delete<ResponseBody<string>>(`${BASE_URL}/${id}`);
};