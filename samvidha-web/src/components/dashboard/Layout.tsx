"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  GraduationCap,
  FileText,
  Calendar,
  User,
  BarChart3,
  LogOut,
  ShieldAlert,
  Folder,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Attendance", href: "/dashboard/attendance", icon: BarChart3 },
  { name: "CIE Marks", href: "/dashboard/cie-marks", icon: GraduationCap },
  { name: "Timetable", href: "/dashboard/timetable", icon: Calendar },
  { name: "Exam Results", href: "/dashboard/exam-results", icon: FileText },
  { name: "My Box (PDFs)", href: "/dashboard/mybox", icon: Folder },
  { name: "Profile", href: "/dashboard/profile", icon: User },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("samvidha_session");
    }
    router.push("/");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-gray-200 bg-white transition-all duration-300 ${
          open ? "" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary p-0.5">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-primary tracking-tight">Samvidha</span>
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:bg-gray-100"
            aria-label="Toggle sidebar"
          >
            {open ? (
              <span className="material-symbols-outlined">close</span>
            ) : (
              <span className="material-symbols-outlined">menu</span>
            )}
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => router.push(item.href)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-primary"
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/50"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Sidebar overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-10 lg:hidden bg-black/50"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className={`flex-1 lg:pl-64 overflow-y-auto p-6 ${!open ? "lg:pl-0" : ""}`}>
        {children}
      </div>
    </div>
  );
}
