"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint, Clock, Minus, Plus, Calculator } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";
import { apiPost, getSession } from "@/lib/client";

interface BioData {
  logs: { date: string; time: string; direction: string }[];
  hasData: boolean;
  portalNotice?: string;
}

export default function BiometricPage() {
  const [data, setData] = useState<BioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulateAttend, setSimulateAttend] = useState(0);
  const [simulateBunk, setSimulateBunk] = useState(0);

  const load = useCallback(async () => {
    if (!getSession()) return;
    setLoading(true);
    try {
      const json = await apiPost<{ success: boolean; data: BioData }>("/api/biometric");
      if (json.success) setData(json.data || { logs: [], hasData: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onSync = () => load();
    window.addEventListener("iare:sync", onSync);
    return () => window.removeEventListener("iare:sync", onSync);
  }, [load]);

  const baseDays = data?.logs.length ?? 0;
  const baseAttended = data?.logs.filter((l) => l.direction.toUpperCase().startsWith("IN")).length ?? baseDays;
  const projectedDays = baseDays + simulateAttend + simulateBunk;
  const projectedAttended = baseAttended + simulateAttend;
  const projectedPct = projectedDays > 0 ? (projectedAttended / projectedDays) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
          <Fingerprint className="h-6 w-6 text-indigo-400" /> Biometric Entry Logs
        </h1>
        <p className="mt-1 text-sm text-slate-400">Detailed history of your campus entry configurations</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Simulator */}
        <div className="panel relative overflow-hidden p-6">
          <div className="mb-4 flex items-center gap-2">
            <Calculator className="h-4.5 w-4.5 text-slate-300" />
            <h2 className="text-base font-bold text-white">Simulator</h2>
          </div>
          <Fingerprint className="pointer-events-none absolute right-6 top-6 h-24 w-24 text-slate-800" />

          <div className="rounded-xl border border-[#1c2940] bg-[#0a1120] p-5 text-center">
            <p className="text-xs font-semibold tracking-wider text-slate-500">PROJECTED ATTENDANCE</p>
            <p className={`mt-2 text-4xl font-extrabold ${projectedPct >= 75 ? "text-emerald-400" : "text-red-400"}`}>
              {projectedPct.toFixed(0)}%
            </p>
            <p className="mt-1 font-mono text-[11px] text-slate-500">
              ({projectedAttended} / {projectedDays} active days)
            </p>
            <p className="mt-3 font-mono text-[11px] text-slate-600">
              exact: {projectedAttended} ÷ {projectedDays} × 100 = {projectedPct.toFixed(2)}%
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-[#1c2940] bg-[#0a1120] px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <Plus className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">Simulate Attend</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSimulateAttend((n) => Math.max(0, n - 1))}
                  className="rounded-lg border border-[#1c2940] p-1.5 text-slate-400 hover:bg-white/5"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-bold text-white">{simulateAttend}</span>
                <button
                  onClick={() => setSimulateAttend((n) => n + 1)}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-1.5 text-emerald-300 hover:bg-emerald-500/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#1c2940] bg-[#0a1120] px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <Minus className="h-4 w-4 text-red-400" />
                <span className="text-sm font-semibold text-white">Simulate Bunk</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSimulateBunk((n) => Math.max(0, n - 1))}
                  className="rounded-lg border border-[#1c2940] p-1.5 text-slate-400 hover:bg-white/5"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-bold text-white">{simulateBunk}</span>
                <button
                  onClick={() => setSimulateBunk((n) => n + 1)}
                  className="rounded-lg border border-red-500/40 bg-red-500/10 p-1.5 text-red-300 hover:bg-red-500/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Base Entry Logs */}
        <div className="panel overflow-hidden">
          <div className="border-b border-[#1c2940] px-6 py-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-slate-300" />
              <h2 className="text-base font-bold text-white">Base Entry Logs</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Your historical timeline of campus biometrics.</p>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center text-slate-400">Loading…</div>
          ) : data?.hasData ? (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#0d1526]">
                  <tr className="border-b border-[#1c2940] text-slate-500">
                    <th className="px-6 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Time</th>
                    <th className="px-6 py-2.5 font-medium">Direction</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((l, i) => (
                    <tr key={i} className="border-b border-[#131d33] text-slate-300">
                      <td className="px-6 py-2.5">{l.date}</td>
                      <td className="px-4 py-2.5">{l.time}</td>
                      <td className="px-6 py-2.5">{l.direction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center px-8">
              <Clock className="h-10 w-10 text-slate-700" />
              <p className="mt-3 text-lg font-semibold text-slate-300">No Logs Yet</p>
              {data?.portalNotice ? (
                <p className="mt-1.5 max-w-md text-sm text-slate-500">
                  The portal reports: “{data.portalNotice}” AEBAS entry logs stream here the moment the
                  portal re-enables them.
                </p>
              ) : (
                <p className="mt-1 max-w-xs text-sm text-slate-500">
                  Your biometric database is currently empty for this tenure.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
