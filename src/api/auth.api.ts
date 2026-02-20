import api from "./axios";
import type { LoginAuthReq, LoginAuthRes } from "../features/auth/types";
import type { ResponseBody } from "../common/res-template";

const BASE_URL = "/auth";

export const loginUser = async (data: LoginAuthReq): Promise<LoginAuthRes> => {
  const response = await api.post<ResponseBody<LoginAuthRes>>(
    `${BASE_URL}/login`,
    data
  );
  return response.data.data;
};


export const verifyPassword = async (data: { username: string; password: string }): Promise<boolean> => {
  const res = await api.post<boolean>("/auth/verify-password", data);
  return res.data;
};