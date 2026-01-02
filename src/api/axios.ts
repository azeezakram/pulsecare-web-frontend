import axios from "axios";
import { useAuthStore } from "../store/auth-store";

const BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;
console.log("BASE_URL:", BASE_URL);

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

export default api;
