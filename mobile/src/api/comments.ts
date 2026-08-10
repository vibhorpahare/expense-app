import { api } from "./client";
import type { Comment } from "./types";

export const comments = {
  list: (expense_id: string) =>
    api.get<{ comments: Comment[] }>("/get_comments", { params: { expense_id } }).then((r) => r.data.comments),
  create: (expense_id: string, content: string) => api.post("/create_comment", { expense_id, content }),
  remove: (id: string) => api.post(`/delete_comment/${id}`),
};
