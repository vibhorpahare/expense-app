import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { categories as categoriesApi } from "../api";
import type { Category } from "../api/types";

export interface FlatCategory {
  id: number;
  label: string;
}

function flattenCategories(categories: Category[]): FlatCategory[] {
  const out: FlatCategory[] = [];
  for (const parent of categories) {
    for (const sub of parent.subcategories) {
      out.push({ id: sub.id, label: `${parent.name} / ${sub.name}` });
    }
  }
  return out;
}

export function useCategories() {
  const query = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  const flat = useMemo(() => (query.data ? flattenCategories(query.data) : []), [query.data]);
  return { ...query, flat };
}
