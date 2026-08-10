import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(email, password, firstName, lastName);
      navigate("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(typeof msg === "string" ? msg : "Could not create account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-svh flex items-center justify-center bg-background">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-surface p-8 rounded-2xl shadow-sm border border-outline-variant">
        <h1 className="font-display text-2xl font-bold text-primary mb-6">Splitly</h1>
        {error && <p className="text-sm text-negative mb-4">{error}</p>}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">First name</label>
            <input className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Last name</label>
            <input className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input className="w-full mb-4 px-3 py-2 rounded-lg border border-outline-variant bg-surface-container" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="block text-sm font-medium mb-1">Password</label>
        <input className="w-full mb-6 px-3 py-2 rounded-lg border border-outline-variant bg-surface-container" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <button disabled={busy} className="w-full py-2.5 rounded-full bg-primary text-on-primary font-semibold hover:opacity-90 disabled:opacity-50">
          {busy ? "Creating..." : "Create account"}
        </button>
        <p className="text-sm text-on-surface-variant mt-4 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
