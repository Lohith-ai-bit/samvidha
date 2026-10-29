"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { Activity } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";

const ATTENDANCE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AttendancePage() {
  const [session, setSession] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activeSession = null;
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("samvidha_session");
      if (stored) {
        try {
          activeSession = JSON.parse(stored);
          setSession(activeSession);
        } catch {
          setSession(null);
        }
      }
    }
    fetchData(activeSession);
  }, []);

  async function fetchData(currentSession?: any) {
    const active = currentSession || session;
    if (!active) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: active }),
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load attendance");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <Activity className="h-10 w-10 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">Fetching attendance from Samvidha...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full text-center">
          <h1 className="text-2xl font-bold mb-2">Session expired</h1>
          <p className="text-muted-foreground mb-6">Please log in again.</p>
          <Link href="/">
            <Button>Log in</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const courses = data?.courses || [];
  const studentInfo = data?.studentInfo || {};
  const avgPct =
    courses.length > 0
      ? Math.round(
          (courses.reduce((sum: number, c: any) => sum + c.percentage, 0) /
            courses.length) *
            100
        ) / 100
      : 0;

  const statusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("satisfactory")) return <Badge variant="default">Satisfactory</Badge>;
    if (s.includes("condonation")) return <Badge variant="warning">Condonation</Badge>;
    if (s.includes("shortage")) return <Badge variant="destructive">Shortage</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
            <p className="text-muted-foreground">
              Live per-subject attendance trapped from the Samvidha portal
            </p>
          </div>
          <Button onClick={fetchData}>
            <Activity className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/50 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Average Attendance</CardTitle>
            <CardDescription>{avgPct}%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={cn(
                  "h-4 rounded-full transition-all duration-500",
                  avgPct >= 75 ? "bg-green-500" : avgPct >= 60 ? "bg-yellow-500" : "bg-red-500",
                  `w-[${Math.min(avgPct, 100)}%]`
                )}
              ></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Subjects</CardTitle>
            <CardDescription>{courses.length}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Satisfactory</CardTitle>
            <CardDescription>
              {courses.filter((c: any) => c.status.toLowerCase().includes("satisfactory")).length}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Condonation</CardTitle>
            <CardDescription>
              {courses.filter((c: any) => c.status.toLowerCase().includes("condonation")).length}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Attendance chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Attendance Percentage by Subject</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courses}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="courseName" tick={{ fontSize: 12 }} />
                <YAxis label={{ value: "Attendance %", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="percentage" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {courses.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={ATTENDANCE_COLORS[index % ATTENDANCE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Attendance table */}
      <Card>
        <CardHeader>
          <CardTitle>Subject-wise Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Course Code</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Course Name</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Conducted</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Attended</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">%</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course: any) => (
                  <tr key={course.courseCode} className="border-b hover:bg-gray-50/50">
                    <td className="px-4 py-3">{course.sNo}</td>
                    <td className="px-4 py-3 font-mono">{course.courseCode}</td>
                    <td className="px-4 py-3">{course.courseName}</td>
                    <td className="px-4 py-3">{course.courseType}</td>
                    <td className="px-4 py-3">{course.courseCategory}</td>
                    <td className="px-4 py-3 text-right">{course.conducted}</td>
                    <td className="px-4 py-3 text-right">{course.attended}</td>
                    <td className="px-4 py-3 text-right font-medium">{course.percentage}%</td>
                    <td className="px-4 py-3">{statusBadge(course.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Data trapped live from Samvidha portal ({studentInfo.academicYear || ""} • {studentInfo.semester || ""})
          </p>
        </CardFooter>
      </Card>
    </DashboardLayout>
  );
}
