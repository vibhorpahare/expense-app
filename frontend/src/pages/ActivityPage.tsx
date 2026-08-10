import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications as notificationsApi } from "../lib/api";

export function ActivityPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: notificationsApi.list });

  useEffect(() => {
    notificationsApi.markRead().then(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
  }, [queryClient]);

  if (isLoading) return <p className="text-on-surface-variant">Loading...</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Activity</h1>
      <div className="grid gap-2">
        {data?.notifications.map((n) => (
          <div key={n.id} className="p-3 rounded-lg border border-outline-variant bg-surface">
            {/* eslint-disable-next-line react/no-danger -- Splitwise-style content is server-generated HTML limited to a small safe tag allowlist */}
            <p className="text-sm" dangerouslySetInnerHTML={{ __html: n.content }} />
            <p className="text-xs text-on-surface-variant mt-1">{new Date(n.created_at).toLocaleString()}</p>
          </div>
        ))}
        {data?.notifications.length === 0 && <p className="text-on-surface-variant">No activity yet.</p>}
      </div>
    </div>
  );
}
