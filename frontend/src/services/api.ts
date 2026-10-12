import axios from "axios";
import { validateApiUrl } from "../config/env.js";

const baseURL = validateApiUrl(
  import.meta.env.VITE_API_URL,
  import.meta.env.PROD,
);

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url === "/auth/refresh"
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await api.post("/auth/refresh");

      return api(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  },
);
