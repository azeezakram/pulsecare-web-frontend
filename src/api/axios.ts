import axios, { AxiosError } from "axios";
import { useAuthStore } from "../store/auth-store";
import type { ErrorResponseBody } from "../common/res-template";

const BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<ErrorResponseBody>) => {
    const status = err.response?.status;

    const isExpected404 =
      status === 404

    if (!isExpected404) {
      const backendMsg = err.response?.data?.message;
      const msg = backendMsg || err.message || `Request failed (${status ?? "unknown"})`;
      console.error("API Error:", status, msg);
    }

    const backendMsg = err.response?.data?.message;
    const msg = backendMsg || err.message || `Request failed (${status ?? "unknown"})`;

    return Promise.reject(new Error(msg));
  }
);


export default api;
