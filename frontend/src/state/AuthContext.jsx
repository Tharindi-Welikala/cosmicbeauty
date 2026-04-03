import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("cb_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.data))
      .catch(() => {
        localStorage.removeItem("cb_token");
        localStorage.removeItem("cb_refresh");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("cb_token", res.data.data.token);
    localStorage.setItem("cb_refresh", res.data.data.refreshToken);
    setUser(res.data.data.user);
  };

  const register = async (payload) => api.post("/auth/register", payload);

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("cb_refresh");
      if (refreshToken) await api.post("/auth/logout", { refreshToken });
    } catch (_err) {}
    localStorage.removeItem("cb_token");
    localStorage.removeItem("cb_refresh");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
