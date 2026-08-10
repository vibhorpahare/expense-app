import { api } from "./client";

export const auth = {
  register: (data: { email: string; password: string; first_name: string; last_name?: string }) =>
    api.post("/auth/register", data),
  login: async (email: string, password: string) => {
    const form = new URLSearchParams();
    form.set("username", email);
    form.set("password", password);
    const res = await api.post("/auth/jwt/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return res.data.access_token as string;
  },
};
