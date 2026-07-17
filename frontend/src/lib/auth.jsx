import React, { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, getUser, setToken, setUser, logout as doLogout } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser());
  const [loading, setLoading] = useState(!!getToken() && !getUser());

  useEffect(() => {
    if (getToken() && !user) {
      api.get("/auth/me").then((r) => {
        setUser(r.data);
        setUserState(r.data);
      }).catch(() => doLogout()).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    setToken(r.data.token);
    setUser(r.data.user);
    setUserState(r.data.user);
    return r.data.user;
  };
  const signup = async (payload) => {
    const r = await api.post("/auth/signup", payload);
    setToken(r.data.token);
    setUser(r.data.user);
    setUserState(r.data.user);
    return r.data.user;
  };
  const logout = () => { doLogout(); setUserState(null); };

  return (
    <AuthCtx.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
