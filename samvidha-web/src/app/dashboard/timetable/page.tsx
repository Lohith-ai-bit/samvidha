"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";
import { apiPost, getSession } from "@/lib/client";

interface TimetableCell {
  shortCode: string;
  branch: string;
  room: string;
  faculty: string;
}
interface TimetableData {
  academicYear: string;
  section: string;
  periods: string[];
  rows: { day: string; date: string; cells: (TimetableCell | null)[] }[];
  legend: { sNo: number; code: string; name: string; shortCode: string; staffId: string; staffName: string }[];
  blocks: { block: string; slots: { slot: string; time: string }[] }[];
  ayOptions: string[];
  sectionOptions: { value: string; label: string }[];
}

export default function TimetablePage() {
  const [data, setData] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ay, setAy] = useState("");
  const [section, setSection] = useState("");

  const load = useCallback(
    async (selects?: { ay?: string; section?: string }) => {
      if (!getSession()) return;
      setLoading(true);
      try {
        const json = await apiPost<{ success: boolean; data: TimetableData | null }>(
          "/api/timetable",
          selects
        );
        if (json.success && json.data) {
          setData(json.data);
          setAy((a) => a || json.data!.academicYear);
          setSection((s) => s || json.data!.section);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load();
    const onSync = () => load();
    window.addEventListener("iare:sync", onSync);
    return () => window.removeEventListener("iare:sync", onSync);
  }, [load]);

  const sectionLabel = data?.section?.replace(/^\d+:/, "") || "—";

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Weekly Timetable</h1>
        <p className="mt-1 text-sm text-slate-400">Your real-time period-wise schedule from Samvidha.</p>
      </div>

      <div className="panel overflow-hidden">
        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-4 border-b border-[#1c2940] px-5 py-4">
          <label className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500">
            ACADEMIC YEAR:
            <select
              value={ay}
              onChange={(e) => {
                setAy(e.target.value);
                load({ ay: e.target.value, section });
              }}
              className="rounded-lg border border-[#1c2940] bg-[#0a1120] px-3 py-2 text-sm font-medium text-white focus:outline-none focus:border-blue-500"
            >
              {(data?.ayOptions?.length ? data.ayOptions : [ay]).filter(Boolean).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500">
            BRANCH/SECTION:
            <select
              value={section}
              onChange={(e) => {
                setSection(e.target.value);
                load({ ay, section: e.target.value });
              }}
              className="max-w-xs rounded-lg border border-[#1c2940] bg-[#0a1120] px-3 py-2 text-sm font-medium text-white focus:outline-none focus:border-blue-500"
            >
              {(data?.sectionOptions?.length ? data.sectionOptions : section ? [{ value: section, label: sectionLabel }] : []).map(
                (o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                )
              )}
            </select>
          </label>
          <button
            onClick={() => load({ ay, section })}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-[#1c2940] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {loading && !data ? (
          <div className="flex h-64 items-center justify-center text-slate-400">
            <Calendar className="mr-2 h-5 w-5 animate-pulse" /> Loading timetable…
          </div>
        ) : data && data.rows.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1c2940] bg-[#0a1120] text-slate-400">
                    <th className="px-4 py-3 font-bold tracking-wider">DAY / PERIOD</th>
                    {data.periods.map((p) => (
                      <th key={p} className="px-4 py-3 text-center font-bold tracking-wider">
                        {p.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-[#131d33] align-top">
                      <td className="whitespace-nowrap px-4 py-4">
                        <p className="font-bold text-emerald-400">{row.day.toUpperCase()}</p>
                        {row.date && <p className="mt-0.5 text-slate-500">{row.date}</p>}
                      </td>
                      {row.cells.map((cell, ci) => (
                        <td key={ci} className="px-2 py-3 text-center">
                          {cell ? (
                            <div className="rounded-lg border border-[#1c2940] bg-[#0a1120] px-2 py-2.5">
                              <p className="font-bold text-white">
                                {cell.shortCode}
                                {cell.branch ? ` (${cell.branch})` : ""}
                              </p>
                              {cell.room && (
                                <span className="mt-1.5 inline-block rounded bg-blue-600/15 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                                  Room: {cell.room}
                                </span>
                              )}
                              <p className="mt-1.5 text-[10px] text-slate-500">Faculty Id: {cell.faculty || "—"}</p>
                            </div>
                          ) : (
                            <span className="text-slate-700">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            {data.legend.length > 0 && (
              <div className="border-t border-[#1c2940]">
                <p className="px-5 pt-4 text-xs font-bold tracking-wider text-slate-500">SUBJECTS — {sectionLabel}</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1c2940] text-slate-500">
                        <th className="px-5 py-2 font-medium">S.No</th>
                        <th className="px-4 py-2 font-medium">Subject Code</th>
                        <th className="px-4 py-2 font-medium">Subject Name</th>
                        <th className="px-4 py-2 font-medium">Short Code</th>
                        <th className="px-4 py-2 font-medium">Staff ID</th>
                        <th className="px-5 py-2 font-medium">Staff Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.legend.map((l) => (
                        <tr key={l.sNo} className="border-b border-[#131d33] text-slate-300">
                          <td className="px-5 py-2">{l.sNo}</td>
                          <td className="px-4 py-2 font-semibold text-white">{l.code}</td>
                          <td className="px-4 py-2">{l.name}</td>
                          <td className="px-4 py-2 font-bold text-blue-400">{l.shortCode}</td>
                          <td className="px-4 py-2">{l.staffId}</td>
                          <td className="px-5 py-2">{l.staffName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Period timings */}
            {data.blocks.length > 0 && (
              <div className="grid grid-cols-1 gap-0 border-t border-[#1c2940] md:grid-cols-3">
                {data.blocks.map((b, i) => (
                  <div key={i} className={`p-5 ${i < data.blocks.length - 1 ? "border-b md:border-b-0 md:border-r border-[#1c2940]" : ""}`}>
                    <p className="text-xs font-bold tracking-wider text-blue-400">{b.block}</p>
                    <div className="mt-2 space-y-1.5">
                      {b.slots.map((s, j) => (
                        <div key={j} className="flex justify-between text-xs">
                          <span className="text-slate-400">{s.slot}</span>
                          <span className="font-medium text-slate-200">{s.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-slate-500">
            No timetable data available for this selection.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
