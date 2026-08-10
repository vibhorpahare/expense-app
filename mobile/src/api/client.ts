import axios from "axios";
import { getToken, clearToken } from "../lib/secureStorage";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

// NOTE: no "/api" prefix here -- that only exists via the web app's Vite dev
// proxy. The backend's real routes are top-level (e.g. "/get_groups").
export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Token lifetime is 24h with no refresh endpoint -- on 401 just clear the
    // stored token locally; AuthContext's next refreshUser() call (or the
    // next screen mount) will see no user and fall back to the login screen.
    if (error.response?.status === 401) await clearToken();
    return Promise.reject(error);
  },
);

// RN's FormData accepts {uri, name, type} in place of a browser File/Blob.
export interface UploadAsset {
  uri: string;
  name: string;
  type: string;
}

export function toFormFile(asset: UploadAsset, fieldName = "file") {
  const form = new FormData();
  form.append(fieldName, asset as unknown as Blob);
  return form;
}
