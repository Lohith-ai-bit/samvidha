"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, FileText, Download, ExternalLink } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";
import { apiPost, getSession } from "@/lib/client";

interface QpOption {
  value: string;
  label: string;
  kind: "CIE" | "SEE";
}
interface Paper {
  sno: number;
  sub_code: string;
  sub_title: string;
  exam_date: string;
  qp: string;
  solution: string;
}

export default function QuestionPapersPage() {
  const [options, setOptions] = useState<QpOption[]>([]);
  const [selected, setSelected] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [tab, setTab] = useState<"ALL" | "CIE" | "SEE">("CIE");
  const [loading, setLoading] = useState(true);
  const [loadingPapers, setLoadingPapers] = useState(false);

  const loadPapers = useCallback(async (code: string) => {
    if (!code) return;
    setLoadingPapers(true);
    try {
      const json = await apiPost<{ success: boolean; papers: Paper[] }>("/api/question-papers", { examCode: code });
      if (json.success) setPapers(json.papers || []);
    } finally {
      setLoadingPapers(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (!getSession()) return;
    setLoading(true);
    try {
      const json = await apiPost<{
        success: boolean;
        options: QpOption[];
        selected: string;
        papers: Paper[];
      }>("/api/question-papers");
      if (json.success) {
        setOptions(json.options || []);
        setSelected(json.selected || "");
        setPapers(json.papers || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleOptions = tab === "ALL" ? options : options.filter((o) => o.kind === tab);

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600/15 border border-blue-500/30">
          <BookOpen className="h-5.5 w-5.5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Question Papers/Solutions</h1>
          <p className="mt-1 text-sm text-slate-400">
            Access previous CIE and SEE examination papers dynamically mapped to your registered courses.
          </p>
        </div>
      </div>

      <div className="panel p-5">
        {/* Tabs + selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-[#1c2940] bg-[#0a1120] p-1">
            {(["ALL", "CIE", "SEE"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  tab === t ? "bg-[#1c2940] text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t === "ALL" ? "All Exams" : t}
              </button>
            ))}
          </div>
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              loadPapers(e.target.value);
            }}
            className="min-w-[280px] flex-1 rounded-lg border border-[#1c2940] bg-[#0a1120] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {visibleOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Cards */}
        {loading || loadingPapers ? (
          <div className="flex h-56 items-center justify-center text-slate-400">Loading papers…</div>
        ) : papers.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-slate-500">
            No question papers uploaded for this exam yet.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {papers.map((p) => (
              <div key={p.sno} className="rounded-xl border border-[#1c2940] bg-[#0a1120] p-5 transition-colors hover:border-blue-500/40">
                <div className="flex items-start justify-between">
                  <span className="rounded-md bg-[#16233c] px-2.5 py-1 text-xs font-bold text-slate-300">{p.sub_code}</span>
                  <FileText className="h-4.5 w-4.5 text-slate-500" />
                </div>
                <h3 className="mt-3 min-h-[40px] text-sm font-bold leading-snug text-white">{p.sub_title}</h3>
                <p className="mt-1 text-xs text-slate-500">Conducted: {p.exam_date || "—"}</p>
                <div className="mt-4 flex gap-2">
                  {p.qp ? (
                    <a
                      href={p.qp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500"
                    >
                      <Download className="h-3.5 w-3.5" /> Question Paper
                    </a>
                  ) : (
                    <span className="flex flex-1 items-center justify-center rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-slate-600">
                      Not Uploaded
                    </span>
                  )}
                  {p.solution ? (
                    <a
                      href={p.solution}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Solution
                    </a>
                  ) : (
                    <span className="flex flex-1 items-center justify-center rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-slate-600">
                      No Scheme
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
