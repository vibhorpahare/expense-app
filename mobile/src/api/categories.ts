import { api } from "./client";
import type { Category } from "./types";

export const categories = {
  list: () => api.get<{ categories: Category[] }>("/get_categories").then((r) => r.data.categories),
};
