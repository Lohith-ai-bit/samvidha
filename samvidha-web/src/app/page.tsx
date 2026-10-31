"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Triangle, LogIn, Loader2, Lock } from "lucide-react";
import { getSavedCredentials, loginAndRemember, SamvidhaSession } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [autoMessage, setAutoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoTried = useRef(false);

  function go(session?: SamvidhaSession) {
    if (session) sessionStorage.setItem("samvidha_session", JSON.stringify(session));
    router.push("/dashboard");
    router.refresh();
  }

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await loginAndRemember(username, password);
      if (!remember) {
        // keep the session, but forget the password on this device
        localStorage.removeItem("samvidha_auth");
      }
      go(session);
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
      setLoading(false);
    }
  }

  // Transparent auto-login: if this device already remembers the student's
  // credentials, sign in straight away — every screen then streams live
  // portal data without a manual step.
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;
    const saved = getSavedCredentials();
    if (!saved) return;
    setUsername(saved.username);
    setAutoMessage("Signing you in automatically…");
    loginAndRemember(saved.username, saved.password)
      .then((session) => go(session))
      .catch(() => {
        setAutoMessage(null);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#070b14]">
      <div className="w-full max-w-md">
        <div className="panel p-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-blue-600/15 border border-blue-500/40 flex items-center justify-center">
              <Triangle className="h-6 w-6 text-blue-400" strokeWidth={2.2} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Prism<span className="text-blue-400">.</span>
            </span>
          </div>

          <h1 className="text-center text-lg font-semibold text-white">Samvidha Student Portal</h1>
          <p className="text-center text-sm text-slate-400 mt-1 mb-6">
            Every screen streams live from samvidha.iare.ac.in — nothing stored on a server.
          </p>

          {autoMessage ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              <p className="text-sm text-slate-400">{autoMessage}</p>
              <button
                onClick={() => {
                  setAutoMessage(null);
                  setLoading(false);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-300"
              >
                Use another account
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-xs font-medium text-slate-400 mb-1.5">
                  UNIVERSITY ROLL NUMBER
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="e.g. 24951A05G3"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg bg-[#0a1120] border border-[#1c2940] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-slate-400 mb-1.5">
                  PASSWORD
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg bg-[#0a1120] border border-[#1c2940] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center gap-2.5 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-[#1c2940] bg-[#0a1120] accent-blue-500"
                />
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Lock className="h-3 w-3" />
                  Stay signed in on this device (re-authenticates automatically)
                </span>
              </label>

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:translate-y-px disabled:opacity-60 transition-all px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" /> Sign in to Samvidha
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Your session is used only to fetch live data from{" "}
          <a
            href="https://samvidha.iare.ac.in/"
            className="text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            samvidha.iare.ac.in
          </a>
          . Remembered credentials never leave this browser.
        </p>
      </div>
    </div>
  );
}
