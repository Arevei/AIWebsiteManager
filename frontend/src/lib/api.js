import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("arevei_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export function setToken(t) {
  if (t) localStorage.setItem("arevei_token", t);
  else localStorage.removeItem("arevei_token");
}
export function getToken() {
  return localStorage.getItem("arevei_token");
}
export function setUser(u) {
  if (u) localStorage.setItem("arevei_user", JSON.stringify(u));
  else localStorage.removeItem("arevei_user");
}
export function getUser() {
  try { return JSON.parse(localStorage.getItem("arevei_user")); } catch { return null; }
}
export function logout() { setToken(null); setUser(null); }
