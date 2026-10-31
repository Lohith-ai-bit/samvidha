"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Target, Info, CalendarDays, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";
import { apiPost, getSession } from "@/lib/client";

interface Subject {
  courseCode: string;
  courseName: string;
  conducted: number;
  attended: number;
  percentage: number;
}
interface AttendanceData {
  portalNotice: string;
  hasData: boolean;
  subjects: Subject[];
}
interface TimetableData {
  rows: { day: string; date: string; cells: ({ shortCode: string } | null)[] }[];
  legend: { shortCode: string; code: string; name: string }[];
}
interface CreditData {
  semesters: { semester: string; courses: { courseCode: string; courseName: string; credits: number }[] }[];
}

type Decision = "attend" | "bunk";
// per day -> per period index -> decision
type Simulation = Record<string, Record<number, Decision>>;

const SNAPSHOT_KEY = "iare_attendance_snapshot";

export default function AttendancePredictorPage() {
  const [att, setAtt] = useState<AttendanceData | null>(null);
  const [tt, setTt] = useState<TimetableData | null>(null);
  const [credit, setCredit] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<string>("Entire Week");
  const [sim, setSim] = useState<Simulation>({});

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
      const [attR, ttR, creditR] = await Promise.all([
        apiPost<{ success: boolean; data: AttendanceData }>("/api/attendance"),
        apiPost<{ success: boolean; data: TimetableData | null }>("/api/timetable"),
        apiPost<{ success: boolean; data: CreditData }>("/api/credit-register"),
      ]);
      if (attR.success && attR.data) setAtt(attR.data);
      if (ttR.success && ttR.data) setTt(ttR.data);
      if (creditR.success && creditR.data) setCredit(creditR.data);
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

  const subjects = att?.subjects ?? [];
  const days = tt?.rows.map((r) => r.day) ?? [];
  const weekDays = activeDay === "Entire Week" ? days : days.includes(activeDay) ? [activeDay] : [];

  const baseline = useMemo(() => {
    const map: Record<string, { conducted: number; attended: number }> = {};
    for (const s of subjects) map[s.courseCode] = { conducted: s.conducted, attended: s.attended };
    return map;
  }, [subjects]);

  const shortToCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of tt?.legend ?? []) {
      map[l.shortCode] = l.code;
    }
    return map;
  }, [tt]);

  const projections = useMemo(() => {
    if (!subjects.length) return null;
    const totals = { conducted: 0, attended: 0 };
    const perCourse: Record<
      string,
      { name: string; code: string; baseC: number; baseA: number; extraC: number; extraA: number }
    > = {};
    for (const s of subjects) {
      perCourse[s.courseCode] = { name: s.courseName, code: s.courseCode, baseC: s.conducted, baseA: s.attended, extraC: 0, extraA: 0 };
      totals.conducted += s.conducted;
      totals.attended += s.attended;
    }

    for (const day of weekDays) {
      const row = tt?.rows.find((r) => r.day === day);
      if (!row) continue;
      row.cells.forEach((cell, idx) => {
        const decision = sim[day]?.[idx];
        if (!cell || !decision) return;
        // A cell may cover multiple short codes (e.g. "AIL/AIL")
        const shorts = cell.shortCode.split("/").map((s) => s.trim()).filter(Boolean);
        for (const short of shorts) {
          const code = shortToCode[short] || subjects.find((s) => s.courseName.toUpperCase().includes(short))?.courseCode;
          if (code && perCourse[code]) {
            perCourse[code].extraC += 1;
            if (decision === "attend") perCourse[code].extraA += 1;
          }
          totals.conducted += 1;
          if (decision === "attend") totals.attended += 1;
        }
      });
    }

    const overall = totals.conducted > 0 ? (totals.attended / totals.conducted) * 100 : 0;
    return { perCourse, overall, totals };
  }, [subjects, weekDays, sim, tt, shortToCode]);

  function countSimulated(s: Simulation, activeDays: string[]) {
    let n = 0;
    for (const d of activeDays) for (const _ in s[d] || {}) n++;
    return n;
  }

  function toggle(day: string, idx: number, decision: Decision) {
    setSim((prev) => {
      const next = { ...prev };
      if (activeDay === "Entire Week") {
        // apply to every weekday at this period index
        for (const d of days) {
          next[d] = { ...(next[d] || {}) };
          next[d][idx] = decision;
        }
      } else {
        next[day] = { ...(next[day] || {}) };
        next[day][idx] = decision;
      }
      return next;
    });
  }

  function clearSim() {
    setSim({});
  }

  const currentOverall = subjects.length
    ? (subjects.reduce((a, s) => a + s.attended, 0) / subjects.reduce((a, s) => a + s.conducted, 0)) * 100
    : 0;
  const anySim = Object.values(sim).some((d) => Object.keys(d).length > 0);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
            <Calculator className="h-6 w-6 text-violet-400" /> Attendance Predictor &amp; Forecaster
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Simulate your classes day-by-day across the week and predict your overall attendance.
          </p>
        </div>
        <div className="panel flex items-center gap-5 px-5 py-3.5">
          <div className="text-center">
            <p className="text-[10px] font-bold tracking-wider text-slate-500">CURRENT</p>
            <p className="text-2xl font-extrabold text-white">{subjects.length ? currentOverall.toFixed(0) : "0"}%</p>
          </div>
          <Target className="h-5 w-5 text-blue-400" />
          <div className="text-center">
            <p className="text-[10px] font-bold tracking-wider text-slate-500">PROJECTED</p>
            <p className={`text-2xl font-extrabold ${projections && anySim ? (projections.overall >= 75 ? "text-emerald-400" : "text-red-400") : "text-red-400"}`}>
              {projections && anySim ? projections.overall.toFixed(0) : "0"}%
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-600/10 px-4 py-2.5 text-xs font-medium text-violet-200">
        <Sparkles className="h-3.5 w-3.5" />
        Latest Feature: Multi-day weekly timetable simulation is live! Click any day or{" "}
        <span className="font-bold">Entire Week</span> to simulate.
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1c2940] px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-white">Class-Wise Projections</h2>
            <p className="text-xs text-slate-500">
              Metrics are dynamically assessed against the mandatory 75% threshold constraint.
            </p>
          </div>
          {anySim && (
            <button onClick={clearSim} className="rounded-lg border border-[#1c2940] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5">
              Reset simulation
            </button>
          )}
        </div>

        {loading && !att ? (
          <div className="flex h-64 items-center justify-center text-slate-400">Loading baseline…</div>
        ) : !subjects.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Info className="h-10 w-10 text-slate-600" />
            <p className="mt-4 text-lg font-semibold text-slate-400">No Baseline Data</p>
            <p className="mt-1 max-w-md text-sm text-slate-600">
              {att?.portalNotice ||
                "Unable to render predictions without active Samvidha attendance matrices. The portal re-enables them next semester."}
            </p>
          </div>
        ) : (
          <div className="p-5">
            {/* Day tabs */}
            <div className="mb-5 flex flex-wrap gap-2">
              {["Entire Week", ...days].map((d) => (
                <button
                  key={d}
                  onClick={() => setActiveDay(d)}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                    activeDay === d
                      ? "bg-blue-600 text-white"
                      : "border border-[#1c2940] text-slate-400 hover:bg-white/5"
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {d}
                </button>
              ))}
            </div>

            {/* Period toggles for the selected day(s) */}
            <div className="space-y-3">
              {weekDays.map((day) => {
                const row = tt?.rows.find((r) => r.day === day);
                if (!row) return null;
                return (
                  <div key={day} className="rounded-xl border border-[#1c2940] bg-[#0a1120] p-4">
                    <p className="mb-3 text-sm font-bold text-white">
                      {day} {row.date && <span className="text-slate-500">• {row.date}</span>}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {row.cells.map((cell, idx) => {
                        if (!cell) return <div key={idx} />;
                        const decision = sim[day]?.[idx];
                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-xs ${
                              decision === "attend"
                                ? "border-emerald-500/50 bg-emerald-500/10"
                                : decision === "bunk"
                                ? "border-red-500/50 bg-red-500/10"
                                : "border-[#1c2940]"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-bold text-white">Period {idx + 1}: {cell.shortCode}</p>
                            </div>
                            <div className="ml-2 flex shrink-0 gap-1">
                              <button
                                onClick={() => toggle(day, idx, "attend")}
                                className={`rounded px-2 py-1 font-bold ${
                                  decision === "attend" ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-400 hover:text-emerald-300"
                                }`}
                              >
                                Attend
                              </button>
                              <button
                                onClick={() => toggle(day, idx, "bunk")}
                                className={`rounded px-2 py-1 font-bold ${
                                  decision === "bunk" ? "bg-red-600 text-white" : "bg-white/5 text-slate-400 hover:text-red-300"
                                }`}
                              >
                                Bunk
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Projection table */}
            {anySim && projections && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1c2940] text-slate-500">
                      <th className="py-2.5 pr-4 font-medium">Course</th>
                      <th className="py-2.5 pr-4 font-medium">Now</th>
                      <th className="py-2.5 pr-4 font-medium">Simulated</th>
                      <th className="py-2.5 pr-4 font-medium">Projected %</th>
                      <th className="py-2.5 font-medium">Status @ 75%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(projections.perCourse).map((c) => {
                      const projC = c.baseC + c.extraC;
                      const projA = c.baseA + c.extraA;
                      const pct = projC > 0 ? (projA / projC) * 100 : 0;
                      return (
                        <tr key={c.code} className="border-b border-[#131d33] text-slate-300">
                          <td className="py-2.5 pr-4">
                            <span className="font-semibold text-white">{c.code}</span>{" "}
                            <span className="text-slate-500">{c.name}</span>
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-slate-400">
                            {c.baseA}/{c.baseC} ({c.baseC ? ((c.baseA / c.baseC) * 100).toFixed(1) : "0"}%)
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-slate-400">
                            +{c.extraA}A / +{c.extraC}C → {projA}/{projC}
                          </td>
                          <td className={`py-2.5 pr-4 font-bold ${pct >= 75 ? "text-emerald-400" : "text-red-400"}`}>
                            {pct.toFixed(1)}%
                          </td>
                          <td className="py-2.5">
                            {pct >= 75 ? (
                              <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-400">SAFE</span>
                            ) : (
                              <span className="rounded bg-red-500/15 px-2 py-0.5 font-bold text-red-400">AT RISK</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-3 font-mono text-xs text-emerald-300">
                  Projected Overall = {projections.totals.attended} ÷ {projections.totals.conducted} × 100 ={" "}
                  {projections.overall.toFixed(2)}%
                </p>
              </div>
            )}

            {!anySim && (
              <p className="mt-5 text-sm text-slate-500">
                Mark periods above as <span className="font-semibold text-emerald-400">Attend</span> or{" "}
                <span className="font-semibold text-red-400">Bunk</span> to project your attendance. Baseline:{" "}
                {subjects.length} courses from the live Samvidha attendance matrix.
              </p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
