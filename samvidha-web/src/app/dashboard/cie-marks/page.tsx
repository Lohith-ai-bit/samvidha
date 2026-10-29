"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";

export default function CieMarksPage() {
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
      const res = await fetch("/api/cie-marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: active }),
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load CIE marks");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load CIE marks");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <GraduationCap className="h-10 w-10 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">Fetching CIE marks from Samvidha...</p>
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

  const studentInfo = data?.studentInfo || {};
  const semesters = data?.semesters || [];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CIE Marks</h1>
            <p className="text-muted-foreground">
              Continuous Internal Assessment marks — all semesters
            </p>
          </div>
          <Button onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/50 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle>Student Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                {studentInfo.name || "—"} &nbsp;|&nbsp; {studentInfo.rollno ||
                "—"}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{studentInfo.branch || "—"}</Badge>
              <Badge variant="outline">{studentInfo.regulation || "—"}</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Separator className="my-6" />

      {semesters.map((sem: any) => (
        <Card key={`${sem.semester}-${sem.academicYear}`} className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {sem.semester} &middot; {sem.academicYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Theory marks */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Theory
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-6">#</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Code</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Course Name</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-right">CIE-I</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-right">AAT I-I</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-right">AAT I-II</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-right">CIE-II</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-right">AAT II-I</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-right">AAT II-II</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-right w-16">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sem.theory.map((c: any) => (
                      <tr key={c.courseCode} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2">{c.sNo}</td>
                        <td className="px-3 py-2 font-mono">{c.courseCode}</td>
                        <td className="px-3 py-2">{c.courseName}</td>
                        <td className="px-3 py-2 text-right">{c.cieI}</td>
                        <td className="px-3 py-2 text-right">{c.aatI1}</td>
                        <td className="px-3 py-2 text-right">{c.aatI2}</td>
                        <td className="px-3 py-2 text-right">{c.cieII}</td>
                        <td className="px-3 py-2 text-right">{c.aatII1}</td>
                        <td className="px-3 py-2 text-right">{c.aatII2}</td>
                        <td className="px-3 py-2 text-right font-semibold">{c.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lab marks */}
            {sem.labs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                  Laboratory / Practical
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border border-gray-200 rounded-lg">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground w-6">#</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Code</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Course Name</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground text-right">Day to Day</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground text-right">Exam Marks</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground text-right w-16">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sem.labs.map((c: any) => (
                        <tr key={c.courseCode} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2">{c.sNo}</td>
                          <td className="px-3 py-2 font-mono">{c.courseCode}</td>
                          <td className="px-3 py-2">{c.courseName}</td>
                          <td className="px-3 py-2 text-right">{c.dayToDay}</td>
                          <td className="px-3 py-2 text-right">{c.examMarks}</td>
                          <td className="px-3 py-2 text-right font-semibold">{c.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Data trapped live from Samvidha portal
            </p>
          </CardFooter>
        </Card>
      ))}
    </DashboardLayout>
  );
}
