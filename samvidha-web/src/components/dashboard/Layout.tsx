"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  Fingerprint,
  Briefcase,
  Calendar,
  CalendarClock,
  ClipboardList,
  BookOpen,
  GraduationCap,
  FileText,
  Folder,
  User,
  LogOut,
  RefreshCw,
  Moon,
  Sun,
  Bell,
  MessageSquare,
  Triangle,
} from "lucide-react";
import { triggerSync } from "@/lib/client";

const mainNav = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Attendance Predictor", href: "/dashboard/attendance-predictor", icon: Calculator, badge: "NEW" },
  { name: "Biometric", href: "/dashboard/biometric", icon: Fingerprint },
  { name: "PAT / CDC", href: "/dashboard/pat", icon: Briefcase },
  { name: "Timetable", href: "/dashboard/timetable", icon: Calendar },
  { name: "Today's Attendance", href: "/dashboard/todays-attendance", icon: CalendarClock },
  { name: "Attendance Register", href: "/dashboard/attendance", icon: ClipboardList },
  { name: "Question Papers/Solutions", href: "/dashboard/question-papers", icon: BookOpen },
  { name: "SGPA / CGPA Calculator", href: "/dashboard/sgpa-cgpa", icon: GraduationCap },
];

const portalNav = [
  { name: "CIA Marks", href: "/dashboard/cie-marks", icon: FileText },
  { name: "Exam Results", href: "/dashboard/exam-results", icon: GraduationCap },
  { name: "My Box (PDFs)", href: "/dashboard/mybox", icon: Folder },
  { name: "Profile", href: "/dashboard/profile", icon: User },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [light, setLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("iare_theme");
    const isLight = saved === "light";
    setLight(isLight);
    document.documentElement.classList.toggle("light", isLight);
  }, []);

  function toggleTheme() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("iare_theme", next ? "light" : "dark");
  }

  const handleLogout = () => {
    sessionStorage.removeItem("samvidha_session");
    router.push("/");
  };

  const NavItem = ({ item }: { item: (typeof mainNav)[number] }) => {
    const active = pathname === item.href;
    const Icon = item.icon;
    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors border border-transparent ${
          active ? "nav-active" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
      >
        <Icon className="h-4.5 w-4.5 shrink-0" />
        <span className="truncate">{item.name}</span>
        {item.badge && (
          <span className="ml-auto rounded-md bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-[#070b14]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#131d33] bg-[#0b1120] transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-[#131d33] px-5">
          <div className="h-8 w-8 rounded-lg bg-blue-600/15 border border-blue-500/40 flex items-center justify-center">
            <Triangle className="h-4.5 w-4.5 text-blue-400" strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <span className="block text-[15px] font-bold tracking-tight text-white">
              Prism<span className="text-blue-400">.</span>
            </span>
            <span className="block text-[10px] font-medium tracking-wide text-slate-500">
              IARE Student Portal
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {mainNav.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
          <div className="px-3.5 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            Portal Data
          </div>
          {portalNav.map((item) => (
            <NavItem key={item.href} item={item as any} />
          ))}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#131d33] bg-[#0b1120] px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle sidebar"
            >
              <LayoutDashboard className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold text-white">IARE Student Portal</h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="hidden items-center gap-2 text-xs font-medium text-slate-300 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Live Dashboard
            </span>
            <button
              onClick={triggerSync}
              title="Sync from Samvidha"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/5"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Sync</span>
            </button>
            <button
              onClick={toggleTheme}
              title="Toggle theme"
              className="rounded-lg p-2 text-slate-300 hover:bg-white/5"
            >
              {light ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
            <button
              title="Notifications"
              className="relative rounded-lg p-2 text-slate-300 hover:bg-white/5"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <button
              onClick={handleLogout}
              className="ml-1 flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>

      {/* Feedback */}
      <button className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500">
        <MessageSquare className="h-4 w-4" />
        Feedback
      </button>
    </div>
  );
}
