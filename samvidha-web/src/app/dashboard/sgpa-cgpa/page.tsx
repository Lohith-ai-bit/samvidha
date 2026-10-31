"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, Calculator, Trash2, Plus, TrendingUp } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";
import { apiPost, getSession, formatStamp } from "@/lib/client";

interface CreditSemester {
  semester: string;
  courses: {
    courseCode: string;
    courseName: string;
    grade: string;
    gradePoint: number | null;
    credits: number;
    attendance: number | null;
  }[];
  totalCredits: number;
  sgpa: number | null;
  cgpa: number | null;
  weightedPoints: number;
  evaluatedCredits: number;
}
interface CreditData {
  rollNumber: string;
  name: string;
  branch: string;
  semesters: CreditSemester[];
  cgpa: number | null;
  gradeScale: { range: string; point: string; letter: string }[];
}

interface Row {
  id: number;
  title: string;
  credits: number;
  grade: string; // "", "S", "A+", "A", "B+", "B", "C", "F"
}

const GRADE_POINTS: Record<string, number> = { S: 10, "A+": 9, A: 8, "B+": 7, B: 6, C: 5, F: 0 };
const GRADE_OPTIONS = ["--", "S", "A+", "A", "B+", "B", "C", "F"];

let rowId = 1;

export default function SgpaCgpaPage() {
  const [tab, setTab] = useState<"sgpa" | "cgpa">("sgpa");
  const [rows, setRows] = useState<Row[]>([]);
  const [credit, setCredit] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [whatIfSgpa, setWhatIfSgpa] = useState("");
  const [whatIfCredits, setWhatIfCredits] = useState("20");

  const load = useCallback(async () => {
    if (!getSession()) return;
    setLoading(true);
    try {
      const json = await apiPost<{ success: boolean; data: CreditData }>("/api/credit-register");
      if (json.success && json.data) {
        setCredit(json.data);
        // Pre-fill the SGPA calculator with the latest registered semester's subjects
        const last = json.data.semesters[json.data.semesters.length - 1];
        if (last) {
          setRows(
            last.courses.map((c) => ({
              id: rowId++,
              title: `${c.courseCode} — ${c.courseName}`,
              credits: c.credits,
              grade: "",
            }))
          );
        }
        setUpdatedAt(new Date());
      }
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

  /* SGPA (client-side estimation, exact formula) */
  const sgpaCalc = useMemo(() => {
    const totalCredits = rows.reduce((a, r) => a + (r.credits || 0), 0);
    const evaluated = rows.filter((r) => r.grade && r.grade !== "--");
    const points = evaluated.reduce((a, r) => a + (r.credits || 0) * (GRADE_POINTS[r.grade] ?? 0), 0);
    const evaluatedCredits = evaluated.reduce((a, r) => a + (r.credits || 0), 0);
    const sgpa = evaluatedCredits > 0 ? points / evaluatedCredits : 0;
    return { totalCredits, evaluatedCount: evaluated.length, evaluatedCredits, points, sgpa };
  }, [rows]);

  /* CGPA from the portal credit register (exact) */
  const cgpaCalc = useMemo(() => {
    if (!credit) return null;
    let points = 0;
    let credits = 0;
    for (const s of credit.semesters) {
      points += s.weightedPoints;
      credits += s.evaluatedCredits;
    }
    const cgpa = credits > 0 ? points / credits : null;
    return { points, credits, cgpa };
  }, [credit]);

  const projectedCgpa = useMemo(() => {
    if (!cgpaCalc || !cgpaCalc.cgpa) return null;
    const extraSgpa = Number(whatIfSgpa);
    const extraCredits = Number(whatIfCredits);
    if (!extraSgpa || !extraCredits) return null;
    return (cgpaCalc.points + extraSgpa * extraCredits) / (cgpaCalc.credits + extraCredits);
  }, [cgpaCalc, whatIfSgpa, whatIfCredits]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
          <Calculator className="h-6 w-6 text-emerald-400" /> Grade Point Calculator
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Interactively forecast your academic performance natively. This module actively syncs with Samvidha data to
          estimate your SGPA and aggregate your CGPA.
        </p>
        {updatedAt && credit && (
          <p className="mt-2 text-xs text-slate-500">
            Credit Register streamed live for{" "}
            <span className="font-semibold text-slate-300">{credit.rollNumber}</span> · synced{" "}
            <span className="num">{formatStamp(updatedAt)}</span>
          </p>
        )}
      </div>

      <div className="mb-5 inline-flex rounded-lg border border-[#1c2940] bg-[#0a1120] p-1">
        <button
          onClick={() => setTab("sgpa")}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold ${tab === "sgpa" ? "bg-[#1c2940] text-white" : "text-slate-400"}`}
        >
          <Calculator className="h-3.5 w-3.5" /> SGPA Calculator
        </button>
        <button
          onClick={() => setTab("cgpa")}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold ${tab === "cgpa" ? "bg-[#1c2940] text-white" : "text-slate-400"}`}
        >
          <TrendingUp className="h-3.5 w-3.5" /> CGPA Extrapolator
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-400">Syncing Samvidha registry…</div>
      ) : tab === "sgpa" ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* Subjects editor */}
          <div className="panel overflow-hidden xl:col-span-2">
            <div className="border-b border-[#1c2940] px-6 py-5">
              <h2 className="text-lg font-bold text-white">
                {credit?.semesters[credit.semesters.length - 1]?.semester || "V SEMESTER"} Subjects
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Assign credit weights and anticipated grades. Defaults map to your Samvidha registry.
              </p>
            </div>
            <div className="p-5">
              <div className="mb-2 grid grid-cols-[1fr_110px_110px_40px] gap-3 px-1 text-[10px] font-bold tracking-wider text-slate-500">
                <span>SUBJECT TITLE</span>
                <span className="text-center">CREDITS</span>
                <span className="text-center">ESTIMATION</span>
                <span />
              </div>
              <div className="space-y-2.5">
                {rows.map((r) => (
                  <div key={r.id} className="grid grid-cols-[1fr_110px_110px_40px] items-center gap-3">
                    <input
                      value={r.title}
                      onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, title: e.target.value } : x)))}
                      className="rounded-lg border border-[#1c2940] bg-[#0a1120] px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, credits: Math.max(0, x.credits - 1) } : x)))}
                        className="h-7 w-7 rounded-md bg-white/5 text-slate-400 hover:bg-white/10"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-white">{r.credits}</span>
                      <button
                        onClick={() => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, credits: x.credits + 1 } : x)))}
                        className="h-7 w-7 rounded-md bg-white/5 text-slate-400 hover:bg-white/10"
                      >
                        +
                      </button>
                    </div>
                    <select
                      value={r.grade}
                      onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, grade: e.target.value } : x)))}
                      className="rounded-lg border border-[#1c2940] bg-[#0a1120] px-2 py-2 text-center text-sm font-semibold text-white focus:outline-none focus:border-blue-500"
                    >
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                      className="flex justify-center text-slate-600 hover:text-red-400"
                      title="Remove subject"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setRows((rs) => [...rs, { id: rowId++, title: `Subject ${rs.length + 1}`, credits: 3, grade: "" }])}
                className="mt-4 flex items-center gap-1.5 rounded-lg border border-[#1c2940] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
              >
                <Plus className="h-3.5 w-3.5" /> Add subject
              </button>
            </div>
          </div>

          {/* Projection card */}
          <div>
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-6 text-white">
              <div className="flex items-start justify-between">
                <p className="text-xs font-bold tracking-wider text-white/80">PROJECTION</p>
                <GraduationCap className="h-5 w-5 text-white/70" />
              </div>
              <p className="num mt-4 text-5xl font-extrabold tracking-tight">{sgpaCalc.sgpa.toFixed(2)}</p>
              <p className="mt-1 text-sm font-semibold text-white/80">Estimated SGPA</p>
              <p className="num mt-3 font-mono text-[11px] text-white/70">
                {sgpaCalc.points} ÷ {sgpaCalc.evaluatedCredits || 0} = {sgpaCalc.sgpa.toFixed(4)}
              </p>
              <div className="mt-5 grid grid-cols-2 divide-x divide-white/20 border-t border-white/20 pt-4">
                <div>
                  <p className="num text-2xl font-bold">{sgpaCalc.totalCredits}</p>
                  <p className="text-[11px] font-semibold text-white/70">TOTAL CREDITS</p>
                </div>
                <div className="pl-4">
                  <p className="num text-2xl font-bold">
                    {sgpaCalc.evaluatedCount} / {rows.length}
                  </p>
                  <p className="text-[11px] font-semibold text-white/70">EVALUATED</p>
                </div>
              </div>
              {sgpaCalc.evaluatedCount === 0 && cgpaCalc?.cgpa && (
                <button
                  onClick={() => setTab("cgpa")}
                  className="mt-4 w-full rounded-lg bg-black/20 px-3 py-2 text-left text-xs font-semibold text-white/90 hover:bg-black/30"
                >
                  No anticipated grades yet — your official CGPA{" "}
                  <span className="num font-bold">{cgpaCalc.cgpa.toFixed(2)}</span> is streaming live on the
                  CGPA Extrapolator tab →
                </button>
              )}
            </div>
            <p className="mt-3 px-1 text-xs leading-relaxed text-slate-500">
              SGPA = Σ(credits × grade point) ÷ Σ(credits), only counting evaluated subjects. Grade points: S=10,
              A+=9, A=8, B+=7, B=6, C=5, F=0 — the IARE regulation scale from your Credit Register.
            </p>
          </div>
        </div>
      ) : (
        /* CGPA EXTRAPOLATOR */
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="panel overflow-hidden xl:col-span-2">
            <div className="border-b border-[#1c2940] px-6 py-5">
              <h2 className="text-lg font-bold text-white">Semester History — {credit?.name || ""}</h2>
              <p className="mt-1 text-xs text-slate-500">
                Pulled live from your Samvidha Credit Register ({credit?.rollNumber}).
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1c2940] text-slate-500">
                    <th className="px-6 py-3 font-medium">Semester</th>
                    <th className="px-4 py-3 font-medium">Courses</th>
                    <th className="px-4 py-3 font-medium">Credits</th>
                    <th className="px-4 py-3 font-medium">Σ credits × points</th>
                    <th className="px-4 py-3 font-medium">SGPA</th>
                    <th className="px-6 py-3 font-medium">CGPA</th>
                  </tr>
                </thead>
                <tbody>
                  {credit?.semesters.map((s) => (
                    <tr key={s.semester} className="border-b border-[#131d33] text-slate-300">
                      <td className="px-6 py-3 font-semibold text-white">{s.semester}</td>
                      <td className="px-4 py-3">{s.courses.length}</td>
                      <td className="px-4 py-3">{s.evaluatedCredits || s.totalCredits}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{s.weightedPoints || "—"}</td>
                      <td className="px-4 py-3 font-bold text-blue-400">
                        {s.sgpa ?? (s.evaluatedCredits ? (s.weightedPoints / s.evaluatedCredits).toFixed(2) : "—")}
                      </td>
                      <td className="px-6 py-3 font-bold text-emerald-400">{s.cgpa ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cgpaCalc && (
              <div className="border-t border-[#1c2940] px-6 py-4">
                <p className="font-mono text-xs text-emerald-300">
                  CGPA = ({credit?.semesters.map((s) => s.weightedPoints || 0).join(" + ")}) ÷ (
                  {credit?.semesters.map((s) => s.evaluatedCredits || 0).join(" + ")}) = {cgpaCalc.points} ÷{" "}
                  {cgpaCalc.credits} = {cgpaCalc.cgpa?.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-6 text-white">
              <div className="flex items-start justify-between">
                <p className="text-xs font-bold tracking-wider text-white/80">OFFICIAL CGPA</p>
                <GraduationCap className="h-5 w-5 text-white/70" />
              </div>
              <p className="num mt-4 text-5xl font-extrabold tracking-tight">{cgpaCalc?.cgpa?.toFixed(2) ?? "—"}</p>
              <p className="mt-1 text-sm font-semibold text-white/80">
                across {credit?.semesters.filter((s) => s.evaluatedCredits > 0).length || 0} evaluated semesters
              </p>
              {updatedAt && (
                <p className="num mt-3 font-mono text-[11px] text-white/70">
                  Live from Samvidha Credit Register · {formatStamp(updatedAt)}
                </p>
              )}
            </div>

            <div className="panel p-5">
              <p className="text-sm font-bold text-white">What-if projection</p>
              <p className="mt-1 text-xs text-slate-500">Add an expected SGPA for the running semester to extrapolate.</p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <label className="text-[10px] font-bold tracking-wider text-slate-500">
                  EXPECTED SGPA
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 9.10"
                    value={whatIfSgpa}
                    onChange={(e) => setWhatIfSgpa(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#1c2940] bg-[#0a1120] px-3 py-2 text-sm font-medium text-white focus:outline-none focus:border-blue-500"
                  />
                </label>
                <label className="text-[10px] font-bold tracking-wider text-slate-500">
                  CREDITS THIS SEM
                  <input
                    type="number"
                    placeholder="e.g. 20"
                    value={whatIfCredits}
                    onChange={(e) => setWhatIfCredits(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#1c2940] bg-[#0a1120] px-3 py-2 text-sm font-medium text-white focus:outline-none focus:border-blue-500"
                  />
                </label>
              </div>
              {projectedCgpa !== null && (
                <p className="mt-4 font-mono text-sm text-emerald-300">
                  ({cgpaCalc?.points} + {Number(whatIfSgpa)}×{Number(whatIfCredits)}) ÷ ({cgpaCalc?.credits} +{" "}
                  {Number(whatIfCredits)}) = <span className="font-bold">{projectedCgpa.toFixed(2)}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
