"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Info } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";
import { apiPost, getSession } from "@/lib/client";

interface RegisterEntry {
  date: string;
  period: string;
  course: string;
  status: string;
}
interface AttendanceData {
  academicYear: string;
  portalNotice: string;
  hasData: boolean;
  register: RegisterEntry[];
}
interface TimetableData {
  rows: { day: string; date: string; cells: ({ shortCode: string; room: string; faculty: string } | null)[] }[];
  periods: string[];
}

const SNAPSHOT_KEY = "iare_attendance_snapshot";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TodaysAttendancePage() {
  const [att, setAtt] = useState<AttendanceData | null>(null);
  const [tt, setTt] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayLabel, setTodayLabel] = useState("");
  const [todayName, setTodayName] = useState("");

  useEffect(() => {
    const now = new Date();
    const d = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      .format(now)
      .replace(/ /g, "-");
    setTodayLabel(d);
    setTodayName(DAY_NAMES[now.getDay()]);
  }, []);

  const load = useCallback(async () => {
    if (!getSession()) return;
    setLoading(true);
    try {
      if (!att) {
        try {
          const raw = localStorage.getItem(SNAPSHOT_KEY);
          if (raw) setAtt(JSON.parse(raw));
        } catch {}
      }
      const [attR, ttR] = await Promise.all([
        apiPost<{ success: boolean; data: AttendanceData }>("/api/attendance"),
        apiPost<{ success: boolean; data: TimetableData | null }>("/api/timetable"),
      ]);
      if (attR.success && attR.data) setAtt(attR.data);
      if (ttR.success && ttR.data) setTt(ttR.data);
    } finally {
      setLoading(false);
    }
  }, [att]);

  useEffect(() => {
    load();
    const onSync = () => load();
    window.addEventListener("iare:sync", onSync);
    return () => window.removeEventListener("iare:sync", onSync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Today's period status from the register (exact portal entries)
  const todayEntries = useMemo(() => {
    if (!att?.register?.length) return [];
    const norm = (s: string) => s.toLowerCase().replace(/,/g, "").trim();
    return att.register.filter((e) => norm(e.date) === norm(todayLabel) || norm(e.date) === norm(todayLabel.replace(/-/g, " ")));
  }, [att, todayLabel]);

  const ttRow = tt?.rows.find((r) => r.day === todayName);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
          <CalendarClock className="h-6 w-6 text-violet-400" /> Today&apos;s Attendance
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Period-wise present/absent status for {todayName}, {todayLabel}
        </p>
      </div>

      {loading && !att ? (
        <div className="flex h-64 items-center justify-center text-slate-400">Loading today&apos;s status…</div>
      ) : todayEntries.length > 0 ? (
        <div className="panel overflow-hidden">
          <div className="border-b border-[#1c2940] px-5 py-3.5 text-sm font-bold text-white">
            {todayEntries.filter((e) => e.status.toUpperCase().startsWith("P")).length} present •{" "}
            {todayEntries.filter((e) => e.status.toUpperCase().startsWith("A")).length} absent
          </div>
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {todayEntries.map((e, i) => (
              <div
                key={i}
                className={`rounded-xl border px-4 py-3.5 ${
                  e.status.toUpperCase().startsWith("P")
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-red-500/40 bg-red-500/10"
                }`}
              >
                <p className="text-sm font-bold text-white">
                  Period {e.period} — {e.course}
                </p>
                <p className={`mt-1 text-xs font-bold ${e.status.toUpperCase().startsWith("P") ? "text-emerald-400" : "text-red-400"}`}>
                  {e.status.toUpperCase().startsWith("P") ? "PRESENT" : "ABSENT"} ({e.status})
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="panel flex items-start gap-3 px-5 py-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
            <p className="text-sm text-slate-300">
              {att?.portalNotice ||
                "The portal has no day-wise attendance matrix for the current semester right now."}{" "}
              <span className="text-slate-500">
                Period-wise P/A entries will stream here once attendance recording is active again.
              </span>
            </p>
          </div>

          {ttRow && (
            <div className="panel overflow-hidden">
              <div className="border-b border-[#1c2940] px-5 py-3.5 text-sm font-bold text-white">
                Today&apos;s scheduled classes ({todayName} {ttRow.date})
              </div>
              <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
                {ttRow.cells.map((c, i) =>
                  c ? (
                    <div key={i} className="rounded-xl border border-[#1c2940] bg-[#0a1120] px-4 py-3.5">
                      <p className="text-sm font-bold text-white">
                        Period {i + 1}: {c.shortCode}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Room {c.room || "—"} • Faculty {c.faculty || "—"}
                      </p>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
