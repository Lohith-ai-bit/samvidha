"use client";

import { useCallback, useEffect, useState } from "react";
import { Folder, RefreshCw, ExternalLink } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";
import { apiPost, getSession } from "@/lib/client";

interface Item {
  sno: number;
  title: string;
  date: string;
  file: string;
}

export default function MyBoxPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getSession()) return;
    setLoading(true);
    try {
      const json = await apiPost<{ success: boolean; data: Item[] }>("/api/mybox");
      if (json.success) setItems(json.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
            <Folder className="h-6 w-6 text-pink-400" /> My Box
          </h1>
          <p className="mt-1 text-sm text-slate-400">Documents and circulars addressed to you on Samvidha.</p>
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
          <div className="flex h-56 items-center justify-center text-slate-400">Loading My Box…</div>
        ) : items.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center text-center">
            <Folder className="h-10 w-10 text-slate-700" />
            <p className="mt-3 text-sm text-slate-500">Your box is empty right now.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1c2940] bg-[#0a1120] text-xs text-slate-500">
                <th className="px-6 py-3 font-medium">S.No</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-6 py-3 text-right font-medium">File</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b border-[#131d33] text-slate-300">
                  <td className="px-6 py-3.5">{it.sno || i + 1}</td>
                  <td className="px-4 py-3.5 font-medium text-white">{it.title}</td>
                  <td className="px-4 py-3.5">{it.date}</td>
                  <td className="px-6 py-3.5 text-right">
                    {it.file ? (
                      <a
                        href={it.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-pink-600/15 border border-pink-500/30 px-3 py-1.5 text-xs font-bold text-pink-300 hover:bg-pink-600/25"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
