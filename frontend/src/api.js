import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cb_token");
  config.headers = config.headers ?? {};
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = false;
let queued = [];

const flushQueue = (token, err) => {
  queued.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token)));
  queued = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    if (status !== 401 || originalRequest?._retry || originalRequest?.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("cb_refresh");
    if (!refreshToken) return Promise.reject(error);

    originalRequest._retry = true;

    if (refreshing) {
      return new Promise((resolve, reject) => {
        queued.push({
          resolve: (newToken) => {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          },
          reject
        });
      });
    }

    refreshing = true;
    try {
      const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
      const newToken = res.data.data.token;
      const newRefresh = res.data.data.refreshToken;
      localStorage.setItem("cb_token", newToken);
      localStorage.setItem("cb_refresh", newRefresh);
      flushQueue(newToken);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshErr) {
      localStorage.removeItem("cb_token");
      localStorage.removeItem("cb_refresh");
      flushQueue(null, refreshErr);
      return Promise.reject(refreshErr);
    } finally {
      refreshing = false;
    }
  }
);
