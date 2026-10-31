"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  QrCode,
  Calendar,
  Calculator,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Fingerprint,
  Briefcase,
  ArrowRight,
  Info,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";
import { apiPost, getSession, triggerSync, formatStamp } from "@/lib/client";

interface Subject {
  courseCode: string;
  courseName: string;
  conducted: number;
  attended: number;
  percentage: number;
  status: string;
}

interface AttendanceResponse {
  success: boolean;
  data?: {
    academicYear: string;
    semesterLastDate: string;
    portalNotice: string;
    hasData: boolean;
    subjects: Subject[];
    register: { date: string; period: string; course: string; status: string }[];
  };
}

interface PatResponse {
  success: boolean;
  data?: { courses: { code: string; name: string; conducted: string; attended: string; percentage: string }[]; hasData: boolean };
}

interface BioResponse {
  success: boolean;
  data?: { logs: { date: string; time: string; direction: string }[]; hasData: boolean };
}

interface ProfileResponse {
  success: boolean;
  data?: { details: Record<string, string> };
}

const SNAPSHOT_KEY = "iare_attendance_snapshot";

function computeTotals(subjects: Subject[]) {
  const conducted = subjects.reduce((s, c) => s + (Number(c.conducted) || 0), 0);
  const attended = subjects.reduce((s, c) => s + (Number(c.attended) || 0), 0);
  const absent = conducted - attended;
  const percent = conducted > 0 ? (attended / conducted) * 100 : 0;
  // Classes to attend consecutively to reach 75%: (attended + n) / (conducted + n) >= 0.75
  const need = percent < 75 ? Math.ceil((0.75 * conducted - attended) / 0.25) : 0;
  // Classes that can be skipped while staying >= 75%: (attended) / (conducted + x) >= 0.75
  const canBunk = percent >= 75 ? Math.floor(attended / 0.75 - conducted) : 0;
  return { conducted, attended, absent, percent, need, canBunk };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceResponse["data"] | null>(null);
  const [pat, setPat] = useState<PatResponse["data"] | null>(null);
  const [bio, setBio] = useState<BioResponse["data"] | null>(null);
  const [name, setName] = useState("");
  const [rollno, setRollno] = useState("");
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!getSession()) return;
    setLoading(true);
    try {
      const [att, patR, bioR, prof] = await Promise.all([
        apiPost<AttendanceResponse>("/api/attendance"),
        apiPost<PatResponse>("/api/pat"),
        apiPost<BioResponse>("/api/biometric"),
        apiPost<ProfileResponse>("/api/profile"),
      ]);

      if (att.success && att.data) {
        setAttendance(att.data);
        // Cache every sync that contains real data so the dashboard can show
        // the exact last-known calculation even when the portal closes a semester.
        if (att.data.hasData) {
          const snapshot = { ...att.data, syncedAt: new Date().toISOString() };
          localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
          setLastSynced(snapshot.syncedAt);
        } else {
          setLastSynced(null);
        }
      }
      if (patR.success) setPat(patR.data || null);
      if (bioR.success) setBio(bioR.data || null);
      if (prof.success && prof.data?.details) {
        setName(prof.data.details.name || "");
        setRollno(prof.data.details.rollno || getSession()?.username || "");
      } else {
        setRollno(getSession()?.username || "");
      }
      setUpdatedAt(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Restore the last-known exact calculation immediately, then refresh live.
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      if (raw) {
        const snap = JSON.parse(raw);
        setAttendance({ ...snap });
        setLastSynced(snap.syncedAt || null);
      }
    } catch {}

    fetchData();
    const onSync = () => fetchData();
    window.addEventListener("iare:sync", onSync);
    return () => window.removeEventListener("iare:sync", onSync);
  }, [fetchData]);

  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => {
    setHour(new Date().getHours());
  }, []);
  const greeting = hour === null ? "Good day" : hour < 12 ? "Good morning" : hour < 17 ? "Good day" : "Good evening";

  const subjects = attendance?.subjects ?? [];
  const totals = computeTotals(subjects);
  const hasLive = subjects.length > 0;
  const critical = hasLive && totals.percent < 75;
  const safe = hasLive && totals.percent >= 75;

  const quickLinks = [
    { name: "Today's Attendance", desc: "View period-wise P/A status", href: "/dashboard/todays-attendance", icon: CalendarClock, color: "bg-violet-600" },
    { name: "PAT Scanner", desc: "Scan attendance QR", href: "/dashboard/pat", icon: QrCode, color: "bg-indigo-600" },
    { name: "Timetable", desc: "View weekly schedule matrix", href: "/dashboard/timetable", icon: Calendar, color: "bg-sky-600" },
    { name: "Attendance Predictor", desc: "Simulate weekly classes & bunks", href: "/dashboard/attendance-predictor", icon: Calculator, color: "bg-violet-600", badge: "LATEST FEATURE" },
    { name: "Question Papers", desc: "View previous solutions", href: "/dashboard/question-papers", icon: BookOpen, color: "bg-orange-500" },
    { name: "SGPA / CGPA", desc: "Calculate academic grades", href: "/dashboard/sgpa-cgpa", icon: GraduationCap, color: "bg-emerald-600" },
  ];

  return (
    <DashboardLayout>
      {loading && !attendance && (
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Activity className="mr-2 h-5 w-5 animate-pulse" /> Syncing with Samvidha…
        </div>
      )}

      <div className={loading && !attendance ? "hidden" : ""}>
        {/* Greeting */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white lg:text-[28px]">
              {greeting}, <span className="text-blue-400">{name || "Student"}</span>{" "}
              <span className="text-white">({rollno})</span>
            </h1>
            <p className="mt-1 flex items-center gap-2.5 text-sm text-slate-400">
              Real-time Synchronized Layout
              {updatedAt && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  · Updated {formatStamp(updatedAt)}
                  <button
                    onClick={triggerSync}
                    className="text-blue-400 hover:text-blue-300"
                    title="Refresh from Samvidha"
                  >
                    Refresh
                  </button>
                </span>
              )}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            SAMVIDHA LIVE — Streamed Optimized View
          </span>
        </div>

        {/* Top cards */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {/* Overall Attendance hero */}
          <div
            className={`rounded-2xl p-6 lg:col-span-1 ${
              safe
                ? "bg-gradient-to-br from-emerald-600 to-emerald-800"
                : critical
                ? "bg-gradient-to-br from-red-600 to-red-800"
                : "bg-gradient-to-br from-slate-700 to-slate-800"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-white/90">Overall Attendance</p>
                <p className="mt-4 text-6xl font-extrabold tracking-tight text-white">
                  {hasLive ? totals.percent.toFixed(1) : "0"}%
                </p>
              </div>
              <div className="text-right">
                <span className="rounded-md bg-black/25 px-2.5 py-1 text-xs font-bold text-white">
                  Target: 75%
                </span>
                <p className="mt-3 text-sm font-semibold text-white">
                  {hasLive
                    ? totals.need > 0
                      ? `Attend ${totals.need} classes directly`
                      : `You may bunk ${totals.canBunk} classes`
                    : updatedAt
                    ? "Streamed live from Samvidha"
                    : "Synced from portal"}
                </p>
              </div>
            </div>

            {hasLive ? (
              safe ? (
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-emerald-900/40 px-2.5 py-1 text-xs font-bold text-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" /> SAFE
                </span>
              ) : (
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-red-950/50 px-2.5 py-1 text-xs font-bold text-red-200">
                  <AlertTriangle className="h-3.5 w-3.5" /> CRITICAL
                </span>
              )
            ) : (
              <p className="mt-4 max-w-xs text-xs leading-relaxed text-white/70">
                {attendance?.portalNotice ||
                  "No active attendance matrix on the portal right now."}
                {lastSynced && " Showing exact values from your last successful sync."}
              </p>
            )}

            <div className="mt-6 grid grid-cols-3 divide-x divide-white/20 border-t border-white/20 pt-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{totals.conducted}</p>
                <p className="text-[11px] font-semibold tracking-wide text-white/70">CONDUCTED</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totals.attended}</p>
                <p className="text-[11px] font-semibold tracking-wide text-white/70">ATTENDED</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totals.absent}</p>
                <p className="text-[11px] font-semibold tracking-wide text-white/70">ABSENT</p>
              </div>
            </div>
          </div>

          {/* PAT card */}
          <div className="panel p-6">
            <p className="text-xs font-semibold tracking-wider text-slate-500">PAT ATTENDANCE</p>
            {pat && pat.courses.length > 0 ? (
              <div className="mt-4 space-y-3">
                {pat.courses.slice(0, 4).map((c) => (
                  <div key={c.code} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-200">{c.name}</p>
                      <p className="text-xs text-slate-500">
                        {c.attended}/{c.conducted} classes
                      </p>
                    </div>
                    <span className="font-bold text-blue-400">{c.percentage}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-slate-600">
                No PAT Data
              </div>
            )}
          </div>

          {/* Biometric card */}
          <div className="panel p-6">
            <p className="text-xs font-semibold tracking-wider text-slate-500">BIOMETRIC ANALYSIS</p>
            {bio && bio.hasData ? (
              <div className="mt-4 space-y-3">
                <p className="text-3xl font-bold text-white">{bio.logs.length} entries</p>
                <p className="text-sm text-slate-400">
                  Last entry: {bio.logs[0]?.date} {bio.logs[0]?.time}
                </p>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-slate-600">
                No recent biometric data.
              </div>
            )}
          </div>
        </div>

        {/* Exact calculation panel */}
        {hasLive && (
          <div className="panel mt-4 p-5">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Exact Calculation</h3>
            </div>
            <p className="mt-2 font-mono text-xs text-emerald-300">
              Overall % = Σ attended ÷ Σ conducted × 100 = {totals.attended} ÷ {totals.conducted} × 100 ={" "}
              {totals.percent.toFixed(2)}%
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1c2940] text-slate-500">
                    <th className="py-2 pr-4 font-medium">Course</th>
                    <th className="py-2 pr-4 font-medium">Attended</th>
                    <th className="py-2 pr-4 font-medium">Conducted</th>
                    <th className="py-2 pr-4 font-medium">Calculation</th>
                    <th className="py-2 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s) => (
                    <tr key={s.courseCode} className="border-b border-[#131d33] text-slate-300">
                      <td className="py-2 pr-4">
                        <span className="font-semibold text-slate-200">{s.courseCode}</span> {s.courseName}
                      </td>
                      <td className="py-2 pr-4">{s.attended}</td>
                      <td className="py-2 pr-4">{s.conducted}</td>
                      <td className="py-2 pr-4 font-mono text-slate-400">
                        {s.attended} ÷ {s.conducted} × 100
                      </td>
                      <td className={`py-2 font-bold ${s.percentage >= 75 ? "text-emerald-400" : "text-red-400"}`}>
                        {s.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Predictor banner */}
        <div className="panel mt-4 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-sm text-slate-300">
            <span className="mr-2 rounded-md bg-blue-600/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">NOTE</span>
            <span className="font-semibold text-white">Weekly Attendance Predictor</span> is now available — simulate
            your full week&apos;s schedule and safe bunks.
          </p>
          <Link
            href="/dashboard/attendance-predictor"
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-400 hover:text-blue-300"
          >
            Try Predictor <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.name}
                href={q.href}
                className="panel group flex items-center justify-between px-5 py-5 transition-colors hover:border-blue-500/40"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${q.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-bold text-white">
                      {q.name}
                      {q.badge && (
                        <span className="rounded-md bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          ✦ {q.badge}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{q.desc}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-400" />
              </Link>
            );
          })}
        </div>

        {/* Footer quick stats */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link href="/dashboard/sgpa-cgpa" className="panel flex items-center gap-4 px-5 py-4 hover:border-emerald-500/40">
            <GraduationCap className="h-5 w-5 text-emerald-400" />
            <p className="text-sm text-slate-300">
              CGPA &amp; SGPA are pulled live from your Credit Register —{" "}
              <span className="font-semibold text-white">open the calculator →</span>
            </p>
          </Link>
          <Link href="/dashboard/timetable" className="panel flex items-center gap-4 px-5 py-4 hover:border-sky-500/40">
            <Calendar className="h-5 w-5 text-sky-400" />
            <p className="text-sm text-slate-300">
              Weekly timetable streams straight from Samvidha —{" "}
              <span className="font-semibold text-white">view the matrix →</span>
            </p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
