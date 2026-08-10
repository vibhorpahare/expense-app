import { api } from "./client";
import type { DashboardSummary } from "./types";

export const dashboard = {
  summary: () => api.get<DashboardSummary>("/get_dashboard").then((r) => r.data),
};
