"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, RefreshCw, Filter, Info } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";
import { apiPost, getSession } from "@/lib/client";

interface RegisterEntry {
  date: string;
  period: string;
  course: string;
  status: string;
}
interface Subject {
  courseCode: string;
  courseName: string;
  conducted: number;
  attended: number;
  percentage: number;
  status: string;
}
interface AttendanceData {
  academicYear: string;
  semesterLastDate: string;
  portalNotice: string;
  hasData: boolean;
  subjects: Subject[];
  register: RegisterEntry[];
}
interface CreditSemester {
  semester: string;
  courses: {
    courseCode: string;
    courseName: string;
    credits: number;
    attendance: number | null;
    grade: string;
    gradePoint: number | null;
  }[];
}
interface CreditData {
  semesters: CreditSemester[];
  cgpa: number | null;
}

const SNAPSHOT_KEY = "iare_attendance_snapshot";

export default function AttendanceRegisterPage() {
  const [att, setAtt] = useState<AttendanceData | null>(null);
  const [credit, setCredit] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [historySem, setHistorySem] = useState("");

  const load = useCallback(async () => {
    if (!getSession()) return;
    setLoading(true);
    try {
      // restore cached snapshot instantly
      try {
        const raw = localStorage.getItem(SNAPSHOT_KEY);
        if (raw) setAtt(JSON.parse(raw));
      } catch {}

      const [attR, creditR] = await Promise.all([
        apiPost<{ success: boolean; data: AttendanceData }>("/api/attendance"),
        apiPost<{ success: boolean; data: CreditData }>("/api/credit-register"),
      ]);
      if (attR.success && attR.data) {
        setAtt(attR.data);
        if (attR.data.hasData) {
          localStorage.setItem(
            SNAPSHOT_KEY,
            JSON.stringify({ ...attR.data, syncedAt: new Date().toISOString() })
          );
        }
      }
      if (creditR.success && creditR.data) {
        setCredit(creditR.data);
        const firstEvaluated =
          [...creditR.data.semesters].reverse().find((s) => s.courses.some((c) => c.attendance !== null))?.semester || "";
        setHistorySem((h) => h || firstEvaluated);
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

  // Build the day × subject matrix from register entries
  const matrix = useMemo(() => {
    if (!att?.register?.length) return null;
    const dates = [...new Set(att.register.map((e) => e.date))];
    const courses = [...new Set(att.register.map((e) => e.course))].filter(Boolean);

    // sort dates newest first (handle both "30 Oct, 2026" and "2026-10-30")
    const parseDate = (d: string) => {
      const iso = Date.parse(d);
      if (!isNaN(iso)) return iso;
      const m = d.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*,?\s+(\d{4})/);
      if (m) return Date.parse(`${m[2]} ${m[1]} ${m[3]}`);
      return 0;
    };
    dates.sort((a, b) => parseDate(b) - parseDate(a));

    const cell = new Map<string, RegisterEntry>();
    for (const e of att.register) cell.set(`${e.date}|${e.course}`, e);

    const perCourse: Record<string, { p: number; a: number }> = {};
    for (const e of att.register) {
      if (!perCourse[e.course]) perCourse[e.course] = { p: 0, a: 0 };
      if (e.status.toUpperCase().startsWith("P")) perCourse[e.course].p++;
      else if (e.status.toUpperCase().startsWith("A")) perCourse[e.course].a++;
    }

    return { dates, courses, cell, perCourse };
  }, [att]);

  const shownCourses = matrix ? (filter === "ALL" ? matrix.courses : matrix.courses.filter((c) => c === filter)) : [];

  function badge(status: string) {
    const s = status.toUpperCase();
    if (s.startsWith("P")) {
      return (
        <span className="inline-flex min-w-[26px] justify-center rounded bg-emerald-500/15 px-1.5 py-1 text-[10px] font-bold text-emerald-400">
          {status}
        </span>
      );
    }
    if (s.startsWith("A")) {
      return (
        <span className="inline-flex min-w-[26px] justify-center rounded bg-red-500/15 px-1.5 py-1 text-[10px] font-bold text-red-400">
          {status}
        </span>
      );
    }
    return <span className="text-slate-700">·</span>;
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
            <ClipboardList className="h-6 w-6 text-orange-400" /> Attendance Register
          </h1>
          <p className="mt-1 text-sm text-slate-400">Day-wise period attendance matrix from Samvidha</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-[#1c2940] bg-[#0a1120] px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Subjects</option>
              {matrix?.courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3.5 py-2 text-xs font-bold text-orange-300 hover:bg-orange-500/20"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {loading && !att ? (
        <div className="flex h-64 items-center justify-center text-slate-400">Loading register…</div>
      ) : matrix ? (
        <div className="panel overflow-hidden">
          <div className="border-b border-[#1c2940] px-5 py-3 text-xs font-semibold text-slate-400">
            {matrix.dates.length} days × {matrix.courses.length} subjects • {att!.register.length} total entries
          </div>
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#0d1526]">
                <tr className="border-b border-[#1c2940]">
                  <th className="px-4 py-3 font-bold tracking-wider text-slate-400">DATE</th>
                  {shownCourses.map((c) => {
                    const { p, a } = matrix.perCourse[c] || { p: 0, a: 0 };
                    const pct = p + a > 0 ? Math.round((p / (p + a)) * 100) : 0;
                    return (
                      <th key={c} className="px-3 py-3 text-center font-semibold">
                        <p className="max-w-[110px] truncate text-slate-300">{c}</p>
                        <p className={`mt-0.5 ${pct >= 75 ? "text-emerald-400" : "text-red-400"}`}>{pct}%</p>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {matrix.dates.map((d) => (
                  <tr key={d} className="border-b border-[#131d33] hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-200">{d}</td>
                    {shownCourses.map((c) => {
                      const e = matrix.cell.get(`${d}|${c}`);
                      return <td key={c} className="px-3 py-3 text-center">{e ? badge(e.status) : <span className="text-slate-800">·</span>}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* Portal has no active register — explain + show real historical attendance */}
          <div className="panel mb-4 flex items-start gap-3 px-5 py-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
            <p className="text-sm text-slate-300">
              {att?.portalNotice ||
                "The portal has no day-wise attendance matrix for the current semester right now."}{" "}
              <span className="text-slate-500">
                (Academic Year {att?.academicYear || "—"}, semester last date {att?.semesterLastDate || "—"}.) The matrix
                appears here automatically once the portal re-enables attendance for the next semester.
              </span>
            </p>
          </div>

          {credit && credit.semesters.length > 0 && (
            <div className="panel overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1c2940] px-5 py-4">
                <p className="text-sm font-semibold text-white">
                  Historical course-wise attendance <span className="text-slate-500">(from Credit Register)</span>
                </p>
                <select
                  value={historySem}
                  onChange={(e) => setHistorySem(e.target.value)}
                  className="rounded-lg border border-[#1c2940] bg-[#0a1120] px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {credit.semesters.map((s) => (
                    <option key={s.semester} value={s.semester}>
                      {s.semester}
                    </option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1c2940] text-slate-500">
                      <th className="px-5 py-3 font-medium">Course Code</th>
                      <th className="px-4 py-3 font-medium">Course Name</th>
                      <th className="px-4 py-3 font-medium">Credits</th>
                      <th className="px-4 py-3 font-medium">Attendance %</th>
                      <th className="px-5 py-3 font-medium">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(credit.semesters.find((s) => s.semester === historySem)?.courses || []).map((c) => (
                      <tr key={c.courseCode} className="border-b border-[#131d33] text-slate-300">
                        <td className="px-5 py-2.5 font-semibold text-white">{c.courseCode}</td>
                        <td className="px-4 py-2.5">{c.courseName}</td>
                        <td className="px-4 py-2.5">{c.credits.toFixed(2)}</td>
                        <td className={`px-4 py-2.5 font-bold ${(c.attendance ?? 0) >= 75 ? "text-emerald-400" : "text-red-400"}`}>
                          {c.attendance === null ? "—" : `${c.attendance.toFixed(2)}%`}
                        </td>
                        <td className="px-5 py-2.5">{c.grade || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
