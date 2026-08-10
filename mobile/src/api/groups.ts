import { api, toFormFile, UploadAsset } from "./client";
import type { Debt, Group } from "./types";

export const groups = {
  list: (includeArchived = false) =>
    api
      .get<{ groups: Group[] }>("/get_groups", { params: { include_archived: includeArchived } })
      .then((r) => r.data.groups),
  get: (id: string) => api.get<{ group: Group }>(`/get_group/${id}`).then((r) => r.data.group),
  create: (data: { name: string; group_type: string; member_emails: string[] }) =>
    api.post<{ group: Group }>("/create_group", data).then((r) => r.data.group),
  update: (id: string, data: Partial<{ name: string; group_type: string; simplify_by_default: boolean }>) =>
    api.post<{ group: Group }>(`/update_group/${id}`, data).then((r) => r.data.group),
  remove: (id: string) => api.post(`/delete_group/${id}`),
  uploadAvatar: (id: string, asset: UploadAsset) =>
    api
      .post<{ group: Group }>(`/groups/${id}/avatar`, toFormFile(asset), {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.group),
  archive: (id: string) =>
    api.post<{ success: boolean; errors: Record<string, string[]> }>(`/groups/${id}/archive`).then((r) => r.data),
  unarchive: (id: string) =>
    api.post<{ success: boolean; errors: Record<string, string[]> }>(`/groups/${id}/unarchive`).then((r) => r.data),
  addMember: (groupId: string, userId: string) =>
    api.post(`/add_user_to_group`, null, { params: { group_id: groupId, user_id: userId } }),
  removeMember: (groupId: string, userId: string) =>
    api.post(`/remove_user_from_group`, null, { params: { group_id: groupId, user_id: userId } }),
  simplifiedDebts: (id: string) =>
    api.get<{ simplified_debts: Debt[] }>(`/get_group/${id}/simplified_debts`).then((r) => r.data.simplified_debts),
  settleDebt: (id: string, data: { from_user_id: string; to_user_id: string; amount: string; currency_code: string }) =>
    api.post<{ success: boolean }>(`/groups/${id}/settle_debt`, data).then((r) => r.data),
};
