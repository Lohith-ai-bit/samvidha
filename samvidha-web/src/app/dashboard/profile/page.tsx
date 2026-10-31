"use client";

import { useCallback, useEffect, useState } from "react";
import { User, RefreshCw, Fingerprint, GraduationCap, Users } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";
import { apiPost, getSession } from "@/lib/client";

interface ProfileData {
  details: Record<string, string>;
  certificates: { sNo: number; name: string; status: string }[];
}

const LABELS: Record<string, string> = {
  name: "Name",
  rollno: "Roll Number",
  abcId: "ABC ID",
  aebasId: "JNTUH AEBAS ID",
  branch: "Branch",
  yearSem: "Year / Semester",
  section: "Section",
  gender: "Gender",
  aadhar: "Aadhar Number",
  fatherName: "Father Name",
  motherName: "Mother Name",
  fatherOccupationType: "Father Occupation Type",
  fatherOccupation: "Father Occupation",
  motherOccupationType: "Mother Occupation Type",
  phone: "Phone Number",
  email: "Email",
  dob: "Date of Birth",
  admissionYear: "Admission Year",
};

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getSession()) return;
    setLoading(true);
    try {
      const json = await apiPost<{ success: boolean; data: ProfileData }>("/api/profile");
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

  const details = data?.details || {};
  const entries = Object.entries(LABELS).filter(([k]) => details[k]);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
            <User className="h-6 w-6 text-indigo-400" /> Profile
          </h1>
          <p className="mt-1 text-sm text-slate-400">Your student record as held by the Samvidha portal.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-[#1c2940] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center text-slate-400">Loading profile…</div>
      ) : (
        <div className="space-y-4">
          {/* Identity header */}
          <div className="panel flex flex-wrap items-center gap-5 p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/15 border border-blue-500/30">
              <GraduationCap className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{details.name || "—"}</h2>
              <p className="text-sm text-slate-400">
                {details.rollno || getSession()?.username} • {details.branch || "—"} • Section {details.section || "—"}
              </p>
            </div>
            {details.aebasId && (
              <div className="ml-auto flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2">
                <Fingerprint className="h-4 w-4 text-indigo-300" />
                <span className="text-xs font-semibold text-indigo-200">AEBAS {details.aebasId}</span>
              </div>
            )}
          </div>

          {/* Details grid */}
          <div className="panel overflow-hidden">
            <div className="border-b border-[#1c2940] px-6 py-4 text-sm font-bold text-white">Student Details</div>
            <div className="grid grid-cols-1 md:grid-cols-2">
              {entries.map(([k, label], i) => (
                <div
                  key={k}
                  className={`flex items-center justify-between gap-4 px-6 py-3.5 text-sm ${
                    i < entries.length - 1 ? "border-b border-[#131d33]" : ""
                  } ${i % 2 === 0 ? "md:border-r" : ""}`}
                >
                  <span className="text-slate-500">{label}</span>
                  <span className="text-right font-semibold text-white">{details[k]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Certificates */}
          {data?.certificates && data.certificates.length > 0 && (
            <div className="panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[#1c2940] px-6 py-4 text-sm font-bold text-white">
                <Users className="h-4 w-4 text-slate-400" /> Certificates
              </div>
              <table className="w-full text-left text-sm">
                <tbody>
                  {data.certificates.map((c) => (
                    <tr key={c.sNo} className="border-b border-[#131d33] text-slate-300">
                      <td className="px-6 py-3 text-slate-500">{c.sNo}</td>
                      <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                      <td className="px-6 py-3 text-right">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
