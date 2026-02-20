import axios from "axios";
import { useAuthStore } from "../store/auth-store";

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
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        status: 0,
        message: "Network error. Please check your connection.",
      });
    }

    const { status, data } = error.response;

    switch (status) {
      case 400:
        return Promise.reject({
          status,
          message: data?.message,
        });

      case 401:
        useAuthStore.getState().logout();
        return Promise.reject({
          status,
          message: data?.message,
        });

      case 403:
        return Promise.reject({
          status,
          message: "You are not authorized to perform this action.",
        });

      case 404:
        return Promise.reject({
          status,
          message: data?.message ?? "Resource not found.",
        });

      case 409:
        return Promise.reject({
          status,
          message: data?.message ?? "Conflict occurred.",
        });

      case 422:
        return Promise.reject({
          status,
          message: data?.message ?? "Validation error.",
        });

      case 500:
        return Promise.reject({
          status,
          message: "Something went wrong. Please try again later.",
        });

      default:
        return Promise.reject({
          status,
          message: data?.message ?? "Unexpected error occurred.",
        });
    }
  }
);

export default api;
