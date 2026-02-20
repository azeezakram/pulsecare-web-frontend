import api from "./axios";
import axios from "axios";
import type { UserReq, UserRes } from "../features/user/types";
import type { ResponseBody } from "../common/res-template";

const BASE_URL = "/user";

export const fetchUserById = async (id: string): Promise<UserRes> => {
    const response = await api.get<ResponseBody<UserRes>>(`${BASE_URL}/${id}`);
    return response.data.data;
};

export const fetchUserByUsername = async (username: string): Promise<UserRes> => {
    const response = await api.get<ResponseBody<UserRes>>(`${BASE_URL}/username/${username}`);
    return response.data.data;
};

export const fetchAllUsers = async (): Promise<UserRes[]> => {
    const response = await api.get<ResponseBody<UserRes[]>>(BASE_URL);
    return response.data.data;
};

export const createUser = async (user: UserReq): Promise<UserRes> => {  
    const response = await api.post<ResponseBody<UserRes>>(BASE_URL, user);
    return response.data.data;
};

export const updateUser = async (id: string, user: UserReq): Promise<UserRes> => {
    const response = await api.put<ResponseBody<UserRes>>(`${BASE_URL}/${id}`, user);
    return response.data.data;
};

export const deleteUser = async (id: string): Promise<unknown> => {
    const response = await api.delete(`${BASE_URL}/${id}`);
    return response.data;
};

export const isUsernameTaken = async (username: string): Promise<boolean> => {
    const response = await api.get<boolean>(`${BASE_URL}/username/validate/${username}`);
    return response.data;
};

export const fetchProfilePicture = async (id: string): Promise<string | null> => {
  try {
    const res = await api.get(`/user/${id}/image`, { responseType: "blob" });
    return URL.createObjectURL(res.data);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
};


export const updateProfileImage = async (id: string, image: FormData): Promise<unknown> => {
    const response = await api.put(`${BASE_URL}/${id}/image`, image, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
};

