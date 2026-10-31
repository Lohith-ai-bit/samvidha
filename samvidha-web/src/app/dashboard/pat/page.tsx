"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase, Info } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";
import { apiPost, getSession } from "@/lib/client";

interface PatData {
  cdcCourses: string[];
  cdcRow: Record<string, string>;
  courses: { sNo: string; code: string; name: string; conducted: string; attended: string; percentage: string; status: string }[];
  daily: { sNo: string; course: string; date: string; period: string; status: string }[];
  hasData: boolean;
}

export default function PatPage() {
  const [data, setData] = useState<PatData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getSession()) return;
    setLoading(true);
    try {
      const json = await apiPost<{ success: boolean; data: PatData }>("/api/pat");
      if (json.success) setData(json.data || null);
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

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
          <Briefcase className="h-6 w-6 text-amber-400" /> PAT / CDC Attendance
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Placement &amp; Training (PAT) batch attendance and CDC course matrix from Samvidha.
        </p>
      </div>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center text-slate-400">Loading PAT data…</div>
      ) : data?.hasData ? (
        <div className="space-y-4">
          {data.courses.length > 0 && (
            <div className="panel overflow-hidden">
              <div className="border-b border-[#1c2940] px-5 py-3.5 text-sm font-bold text-white">Course-wise PAT attendance</div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1c2940] text-slate-500">
                      <th className="px-5 py-2.5 font-medium">S.No</th>
                      <th className="px-4 py-2.5 font-medium">Code</th>
                      <th className="px-4 py-2.5 font-medium">Course</th>
                      <th className="px-4 py-2.5 font-medium">Conducted</th>
                      <th className="px-4 py-2.5 font-medium">Attended</th>
                      <th className="px-4 py-2.5 font-medium">%</th>
                      <th className="px-5 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.courses.map((c) => (
                      <tr key={c.sNo} className="border-b border-[#131d33] text-slate-300">
                        <td className="px-5 py-2.5">{c.sNo}</td>
                        <td className="px-4 py-2.5 font-semibold text-white">{c.code}</td>
                        <td className="px-4 py-2.5">{c.name}</td>
                        <td className="px-4 py-2.5">{c.conducted}</td>
                        <td className="px-4 py-2.5">{c.attended}</td>
                        <td className={`px-4 py-2.5 font-bold ${Number(c.percentage) >= 75 ? "text-emerald-400" : "text-red-400"}`}>{c.percentage}%</td>
                        <td className="px-5 py-2.5">{c.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.daily.length > 0 && (
            <div className="panel overflow-hidden">
              <div className="border-b border-[#1c2940] px-5 py-3.5 text-sm font-bold text-white">Daily PAT log</div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full min-w-[500px] text-left text-xs">
                  <thead className="sticky top-0 bg-[#0d1526]">
                    <tr className="border-b border-[#1c2940] text-slate-500">
                      <th className="px-5 py-2.5 font-medium">S.No</th>
                      <th className="px-4 py-2.5 font-medium">Course</th>
                      <th className="px-4 py-2.5 font-medium">Date</th>
                      <th className="px-4 py-2.5 font-medium">Period</th>
                      <th className="px-5 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((d) => (
                      <tr key={d.sNo} className="border-b border-[#131d33] text-slate-300">
                        <td className="px-5 py-2">{d.sNo}</td>
                        <td className="px-4 py-2">{d.course}</td>
                        <td className="px-4 py-2">{d.date}</td>
                        <td className="px-4 py-2">{d.period}</td>
                        <td className="px-5 py-2 font-bold">{d.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.cdcCourses.length > 0 && Object.keys(data.cdcRow).length > 0 && (
            <div className="panel overflow-hidden">
              <div className="border-b border-[#1c2940] px-5 py-3.5 text-sm font-bold text-white">CDC batch matrix</div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1c2940] text-slate-500">
                      {data.cdcCourses.map((c) => (
                        <th key={c} className="px-4 py-2.5 font-medium">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-slate-300">
                      {data.cdcCourses.map((_, i) => (
                        <td key={i} className="px-4 py-2.5">{data.cdcRow[`col${i + 3}`] ?? "—"}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="panel flex flex-col items-center justify-center py-24 text-center">
          <Briefcase className="h-10 w-10 text-slate-700" />
          <p className="mt-3 text-lg font-semibold text-slate-400">No PAT Data</p>
          <p className="mt-1 max-w-md text-sm text-slate-600">
            The Samvidha portal reports no PAT batch or CDC attendance records for your roll number this tenure.
            Data appears here automatically once the training cell uploads it.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
