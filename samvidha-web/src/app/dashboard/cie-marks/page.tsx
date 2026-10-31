"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";
import { apiPost, getSession } from "@/lib/client";

interface CieSemester {
  semester: string;
  academicYear: string;
  theory: Record<string, string>[];
  labs: Record<string, string>[];
}

export default function CieMarksPage() {
  const [semesters, setCieSemesters] = useState<CieSemester[]>([]);
  const [info, setInfo] = useState<Record<string, string>>({});
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getSession()) return;
    setLoading(true);
    try {
      const json = await apiPost<{ success: boolean; data: { studentInfo: Record<string, string>; semesters: CieSemester[] } }>(
        "/api/cie-marks"
      );
      if (json.success && json.data) {
        setCieSemesters(json.data.semesters || []);
        setInfo(json.data.studentInfo || {});
        const highest = [...(json.data.semesters || [])].reverse().find((s) => s.theory.length || s.labs.length);
        setActive((a) => a || highest?.semester || json.data.semesters?.[0]?.semester || "");
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

  const sem = semesters.find((s) => s.semester === active);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
            <BookOpen className="h-6 w-6 text-purple-400" /> CIA Marks
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Continuous Internal Assessment marks — all semesters, theory &amp; laboratories.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={active}
            onChange={(e) => setActive(e.target.value)}
            className="rounded-lg border border-[#1c2940] bg-[#0a1120] px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {semesters.map((s) => (
              <option key={s.semester} value={s.semester}>
                {s.semester} {s.academicYear ? `(${s.academicYear})` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-[#1c2940] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-400">Loading CIA marks…</div>
      ) : !sem ? (
        <div className="panel flex h-56 items-center justify-center text-sm text-slate-500">No CIA marks found.</div>
      ) : (
        <div className="space-y-4">
          {sem.theory.length > 0 && (
            <div className="panel overflow-hidden">
              <div className="border-b border-[#1c2940] px-5 py-3.5 text-sm font-bold text-white">
                Continuous Internal Assessment (Theory) — {sem.academicYear}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1c2940] text-slate-500">
                      <th className="px-5 py-3 font-medium">S.No</th>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Course Name</th>
                      <th className="px-4 py-3 text-center font-medium">CIE-I (10M)</th>
                      <th className="px-4 py-3 text-center font-medium">AAT:I-I (5M)</th>
                      <th className="px-4 py-3 text-center font-medium">AAT:I-II (5M)</th>
                      <th className="px-4 py-3 text-center font-medium">CIE-II (10M)</th>
                      <th className="px-4 py-3 text-center font-medium">AAT:II-I (5M)</th>
                      <th className="px-4 py-3 text-center font-medium">AAT:II-II (5M)</th>
                      <th className="px-5 py-3 text-center font-medium">Total (40M)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sem.theory.map((r) => (
                      <tr key={r.courseCode + r.sNo} className="border-b border-[#131d33] text-slate-300">
                        <td className="px-5 py-2.5">{r.sNo}</td>
                        <td className="px-4 py-2.5 font-semibold text-white">{r.courseCode}</td>
                        <td className="px-4 py-2.5">{r.courseName}</td>
                        <td className="px-4 py-2.5 text-center font-semibold">{r.cieI}</td>
                        <td className="px-4 py-2.5 text-center">{r.aatI1}</td>
                        <td className="px-4 py-2.5 text-center">{r.aatI2}</td>
                        <td className="px-4 py-2.5 text-center font-semibold">{r.cieII}</td>
                        <td className="px-4 py-2.5 text-center">{r.aatII1}</td>
                        <td className="px-4 py-2.5 text-center">{r.aatII2}</td>
                        <td className="px-5 py-2.5 text-center font-bold text-blue-400">{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sem.labs.length > 0 && (
            <div className="panel overflow-hidden">
              <div className="border-b border-[#1c2940] px-5 py-3.5 text-sm font-bold text-white">
                Laboratory / Seminar Marks
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1c2940] text-slate-500">
                      <th className="px-5 py-3 font-medium">S.No</th>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Course Name</th>
                      <th className="px-4 py-3 font-medium">Day-to-Day (weeks)</th>
                      <th className="px-4 py-3 text-center font-medium">Exam Marks</th>
                      <th className="px-5 py-3 text-center font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sem.labs.map((r) => (
                      <tr key={r.courseCode + r.sNo} className="border-b border-[#131d33] text-slate-300">
                        <td className="px-5 py-2.5">{r.sNo}</td>
                        <td className="px-4 py-2.5 font-semibold text-white">{r.courseCode}</td>
                        <td className="px-4 py-2.5">{r.courseName}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">{r.dayToDay || "—"}</td>
                        <td className="px-4 py-2.5 text-center">{r.examMarks || "—"}</td>
                        <td className="px-5 py-2.5 text-center font-bold text-blue-400">{r.total || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sem.theory.length === 0 && sem.labs.length === 0 && (
            <div className="panel flex h-56 items-center justify-center text-sm text-slate-500">
              No marks published for {sem.semester} yet.
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
