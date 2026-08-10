import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { API_URL } from "./client";
import { getToken } from "../lib/secureStorage";

// RN has no URL.createObjectURL/anchor-download -- download to cache then
// hand off to the OS share sheet instead.
export async function exportExpensesCsv(params: {
  group_id?: string;
  friend_id?: string;
  category_id?: number;
  payer_id?: string;
  dated_after?: string;
  dated_before?: string;
}) {
  const token = await getToken();
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query[key] = String(value);
  }
  const qs = new URLSearchParams(query).toString();
  const destination = new File(Paths.cache, "expenses.csv");
  if (destination.exists) destination.delete();
  const file = await File.downloadFileAsync(`${API_URL}/export/expenses.csv?${qs}`, destination, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "Export expenses" });
}
