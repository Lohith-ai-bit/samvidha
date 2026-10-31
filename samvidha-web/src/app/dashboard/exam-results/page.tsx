"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, RefreshCw, Eye, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";
import { apiPost, getSession } from "@/lib/client";

interface Exam {
  sno: number;
  exam_title: string;
  exam_code: string;
}
interface GradeSheet {
  rollNumber: string;
  name: string;
  branch: string;
  sgpa: number | null;
  courses: { sNo: number; courseCode: string; courseName: string; grade: string; gradePoint: number | null; status: string; credits: number }[];
}

export default function ExamResultsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [sheet, setSheet] = useState<GradeSheet | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  const load = useCallback(async () => {
    if (!getSession()) return;
    setLoading(true);
    try {
      const json = await apiPost<{ success: boolean; exams: Exam[] }>("/api/exam-results");
      if (json.success) setExams(json.exams || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openSheet(code: string, title: string) {
    setOpenCode(code);
    setSheet(null);
    setSheetLoading(true);
    try {
      const json = await apiPost<{ success: boolean; sheet: GradeSheet }>("/api/exam-results", {
        examCode: code,
        examTitle: title,
      });
      if (json.success) setSheet(json.sheet);
    } finally {
      setSheetLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
            <FileText className="h-6 w-6 text-orange-400" /> Exam Results
          </h1>
          <p className="mt-1 text-sm text-slate-400">Semester-end grade sheets streamed live from Samvidha.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-[#1c2940] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="panel overflow-hidden">
        {loading ? (
          <div className="flex h-56 items-center justify-center text-slate-400">Loading examinations…</div>
        ) : exams.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-slate-500">No examination results published yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1c2940] bg-[#0a1120] text-xs text-slate-500">
                <th className="px-6 py-3 font-medium">S.No</th>
                <th className="px-4 py-3 font-medium">Examination Code</th>
                <th className="px-4 py-3 font-medium">Examination Title</th>
                <th className="px-6 py-3 text-right font-medium">Grade Sheet</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.exam_code} className="border-b border-[#131d33] text-slate-300">
                  <td className="px-6 py-3.5">{e.sno}</td>
                  <td className="px-4 py-3.5 font-semibold text-white">{e.exam_code}</td>
                  <td className="px-4 py-3.5">{e.exam_title}</td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => openSheet(e.exam_code, e.exam_title)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Grade sheet modal */}
      {openCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpenCode(null)}>
          <div
            className="panel max-h-[85vh] w-full max-w-3xl overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Grade Sheet — {openCode}</h3>
                <p className="text-xs text-slate-500">{exams.find((e) => e.exam_code === openCode)?.exam_title}</p>
              </div>
              <button onClick={() => setOpenCode(null)} className="rounded-lg border border-[#1c2940] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5">
                Close
              </button>
            </div>

            {sheetLoading ? (
              <div className="flex h-40 items-center justify-center text-slate-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Fetching grade sheet…
              </div>
            ) : sheet ? (
              <>
                <div className="mb-4 grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg border border-[#1c2940] bg-[#0a1120] p-3">
                    <p className="text-slate-500">Roll Number</p>
                    <p className="mt-0.5 font-bold text-white">{sheet.rollNumber}</p>
                  </div>
                  <div className="rounded-lg border border-[#1c2940] bg-[#0a1120] p-3">
                    <p className="text-slate-500">Name</p>
                    <p className="mt-0.5 font-bold text-white">{sheet.name}</p>
                  </div>
                  <div className="rounded-lg border border-[#1c2940] bg-[#0a1120] p-3">
                    <p className="text-slate-500">SGPA</p>
                    <p className="mt-0.5 font-bold text-emerald-400">{sheet.sgpa ?? "—"}</p>
                  </div>
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1c2940] text-slate-500">
                      <th className="py-2.5 pr-4 font-medium">S.No</th>
                      <th className="py-2.5 pr-4 font-medium">Course Code</th>
                      <th className="py-2.5 pr-4 font-medium">Course Name</th>
                      <th className="py-2.5 pr-4 font-medium">Grade</th>
                      <th className="py-2.5 pr-4 font-medium">Points</th>
                      <th className="py-2.5 pr-4 font-medium">Status</th>
                      <th className="py-2.5 font-medium">Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.courses.map((c) => (
                      <tr key={c.sNo} className="border-b border-[#131d33] text-slate-300">
                        <td className="py-2.5 pr-4">{c.sNo}</td>
                        <td className="py-2.5 pr-4 font-semibold text-white">{c.courseCode}</td>
                        <td className="py-2.5 pr-4">{c.courseName}</td>
                        <td className="py-2.5 pr-4 font-bold text-blue-400">{c.grade}</td>
                        <td className="py-2.5 pr-4">{c.gradePoint ?? "—"}</td>
                        <td className="py-2.5 pr-4">{c.status}</td>
                        <td className="py-2.5">{c.credits.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-slate-500">
                Could not load the grade sheet.
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
