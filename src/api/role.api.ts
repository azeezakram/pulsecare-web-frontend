import api from "./axios";
import type { RoleReq, RoleRes } from "../features/role/type";
import type { ResponseBody } from "../common/res-template";

const BASE_URL = "/role";

export const fetchRoleById = async (id: number): Promise<RoleRes> => {
    const response = await api.get<ResponseBody<RoleRes>>(`${BASE_URL}/${id}`);
    return response.data.data;
};

export const fetchAllRoles = async (): Promise<RoleRes[]> => {
    const res = await api.get<ResponseBody<RoleRes[]>>(BASE_URL);
    return res.data.data;
};

export const createRole = async (role: RoleReq): Promise<RoleRes> => {
    const res = await api.post<ResponseBody<RoleRes>>(BASE_URL, role);
    return res.data.data;
};

export const deleteRole = async (id: number): Promise<string> => {
    const response = await api.delete<ResponseBody<string>>(`${BASE_URL}/${id}`);
    return response.data.message;
};
