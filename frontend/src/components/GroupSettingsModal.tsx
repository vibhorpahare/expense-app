import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { groups as groupsApi, type Group } from "../lib/api";
import { useAuth } from "../lib/auth";

const GROUP_TYPES = ["home", "trip", "couple", "apartment", "house", "other"];

export function GroupSettingsModal({ group, onClose }: { group: Group; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isOwner = user?.id === group.created_by_id;

  const [name, setName] = useState(group.name);
  const [groupType, setGroupType] = useState(group.group_type);
  const [simplify, setSimplify] = useState(group.simplify_by_default);
  const [error, setError] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["group", group.id] });
    queryClient.invalidateQueries({ queryKey: ["groups"] });
  };

  const save = useMutation({
    mutationFn: () => groupsApi.update(group.id, { name, group_type: groupType, simplify_by_default: simplify }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: () => setError("Could not save changes"),
  });

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => groupsApi.uploadAvatar(group.id, file),
    onSuccess: invalidate,
    onError: () => setError("Could not upload image"),
  });

  const toggleArchive = useMutation({
    mutationFn: () => (group.archived_at ? groupsApi.unarchive(group.id) : groupsApi.archive(group.id)),
    onSuccess: (res) => {
      if (!res.success) {
        setError(Object.values(res.errors).flat().join(", ") || "Could not archive group");
        return;
      }
      invalidate();
      onClose();
    },
    onError: () => setError("Could not update archive status"),
  });

  const remove = useMutation({
    mutationFn: () => groupsApi.remove(group.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      navigate("/groups");
    },
    onError: () => setError("Could not delete group -- it may have expenses or a non-zero balance"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Group settings</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {error && <p className="text-sm text-negative">{error}</p>}

          <div className="flex items-center gap-3">
            {group.avatar_url ? (
              <img src={group.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-semibold">
                {group.name[0]?.toUpperCase()}
              </div>
            )}
            <label className="text-sm px-3 py-1.5 rounded-full border border-outline-variant cursor-pointer hover:bg-surface-container">
              Change photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadAvatar.mutate(e.target.files[0])}
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container"
              value={groupType}
              onChange={(e) => setGroupType(e.target.value)}
            >
              {GROUP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center justify-between text-sm">
            <span>Simplify group debts by default</span>
            <input type="checkbox" checked={simplify} onChange={(e) => setSimplify(e.target.checked)} />
          </label>

          <button
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            Save changes
          </button>

          <div className="border-t border-outline-variant pt-4 flex flex-col gap-2">
            <button
              onClick={() => toggleArchive.mutate()}
              className="px-4 py-2 rounded-full border border-outline-variant text-sm font-medium hover:bg-surface-container"
            >
              {group.archived_at ? "Unarchive group" : "Archive group"}
            </button>
            {isOwner && (
              <button
                onClick={() => {
                  if (confirm(`Delete "${group.name}"? This deletes all its expenses too. This cannot be undone.`)) {
                    remove.mutate();
                  }
                }}
                className="px-4 py-2 rounded-full border border-negative text-negative text-sm font-medium hover:bg-negative-bg"
              >
                Delete group
              </button>
            )}
            {!isOwner && <p className="text-xs text-on-surface-variant">Only the group owner can delete it.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
