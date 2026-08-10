import { api } from "./client";
import type { Friend } from "./types";

export const friends = {
  list: () => api.get<{ friends: Friend[] }>("/get_friends").then((r) => r.data.friends),
  get: (id: string) => api.get<{ friend: Friend }>(`/get_friend/${id}`).then((r) => r.data.friend),
  create: (user_email: string) => api.post<{ friend: Friend }>("/create_friend", { user_email }),
  remove: (id: string) => api.post(`/delete_friend/${id}`),
};
