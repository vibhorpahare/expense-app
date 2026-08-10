import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { users } from "../lib/api";

const NOTIFICATION_LABELS: Record<string, string> = {
  added_as_friend: "Someone adds me as a friend",
  added_to_group: "Someone adds me to a group",
  expense_added: "An expense is added",
  expense_updated: "An expense is edited or deleted",
  comment_added: "Someone comments on an expense",
  news: "Splitly news and updates",
};

export function AccountPage() {
  const { user, refreshUser } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState(user?.phone_number ?? "");
  const [password, setPassword] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const refreshMe = () => refreshUser();

  const saveProfile = useMutation({
    mutationFn: () =>
      users.update({
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        ...(password ? { password } : {}),
      }),
    onSuccess: () => {
      setPassword("");
      setSavedMsg("Saved.");
      refreshMe();
      setTimeout(() => setSavedMsg(""), 2000);
    },
  });

  const saveNotifications = useMutation({
    mutationFn: (settings: Record<string, boolean>) => users.update({ notification_settings: settings }),
    onSuccess: refreshMe,
  });

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => users.uploadAvatar(file),
    onSuccess: refreshMe,
  });

  if (!user) return null;

  const toggleNotification = (key: string) => {
    const next = { ...user.notification_settings, [key]: !user.notification_settings[key] };
    saveNotifications.mutate(next);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold mb-6">Your account</h1>

      <div className="p-4 rounded-xl border border-outline-variant bg-surface mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-xl font-bold text-on-primary-container overflow-hidden bg-cover bg-center"
            style={user.avatar_url ? { backgroundImage: `url(${user.avatar_url})` } : undefined}
          >
            {!user.avatar_url && user.first_name[0]}
          </div>
          <div>
            <button
              onClick={() => fileInput.current?.click()}
              className="text-sm px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container"
            >
              Change avatar
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAvatar.mutate(file);
              }}
            />
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile.mutate();
          }}
          className="grid grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">First name</label>
            <input className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last name</label>
            <input className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Email</label>
            <input disabled className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-high text-on-surface-variant" value={user.email} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone number</label>
            <input className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New password</label>
            <input type="password" className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <button className="px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90">Save</button>
            {savedMsg && <span className="text-sm text-positive">{savedMsg}</span>}
          </div>
        </form>
      </div>

      <div className="p-4 rounded-xl border border-outline-variant bg-surface">
        <h2 className="font-display text-lg font-semibold mb-3">Notifications</h2>
        <div className="grid gap-2">
          {Object.entries(NOTIFICATION_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between text-sm py-1">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={!!user.notification_settings[key]}
                onChange={() => toggleNotification(key)}
                className="w-4 h-4 accent-primary"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
