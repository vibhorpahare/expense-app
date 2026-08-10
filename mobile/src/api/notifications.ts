import { api } from "./client";
import type { Notification } from "./types";

export const notifications = {
  list: () =>
    api
      .get<{ notifications: Notification[]; unread_count: number }>("/get_notifications")
      .then((r) => r.data),
  markRead: () => api.post("/notifications/mark_read"),
};
