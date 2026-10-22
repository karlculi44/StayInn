import axios from "axios";
import { getApiBaseUrl } from "../config/env.js";

export const apiBaseURL = getApiBaseUrl(
  import.meta.env.VITE_API_URL,
  import.meta.env.PROD,
);

export const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isCurrentPasswordIncorrect =
      originalRequest?.url === "/auth/me/password" &&
      error.response?.data?.message === "Current password is incorrect";

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url === "/auth/refresh" ||
      isCurrentPasswordIncorrect
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
