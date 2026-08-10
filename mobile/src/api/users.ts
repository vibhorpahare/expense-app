import { api, toFormFile, UploadAsset } from "./client";
import type { CurrentUser } from "./types";

export const users = {
  me: () => api.get<{ user: CurrentUser }>("/get_current_user").then((r) => r.data.user),
  update: (
    data: Partial<{
      first_name: string;
      last_name: string;
      locale: string;
      phone_number: string;
      password: string;
      notification_settings: Record<string, boolean>;
    }>,
  ) => api.patch<CurrentUser>("/users/me", data).then((r) => r.data),
  uploadAvatar: (asset: UploadAsset) =>
    api
      .post<{ user: CurrentUser }>("/users/me/avatar", toFormFile(asset), {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.user),
};
