"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, RefreshCw, FileText } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";

export default function ProfilePage() {
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
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: active }),
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load profile");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <User className="h-10 w-10 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">Fetching profile from Samvidha...</p>
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

  const parsed = data?.parsed || {};
  const details = parsed.details || {};
  const certificates = parsed.certificates || [];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
            <p className="text-muted-foreground">
              Student profile and certificates from Samvidha portal
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

      {/* Student info card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Student Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Name</p>
            <p className="text-lg font-medium">{details.name || "—"}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Roll Number</p>
            <p className="text-lg font-mono font-medium">{details.rollno || session.username}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Department</p>
            <p className="text-lg font-medium">{details.department || "—"}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 md:col-span-3">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Session</p>
            <p className="text-sm">
              Authenticated with Samvidha portal (no data stored locally)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Certificates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Certificates & Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certificates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border border-gray-200 rounded-lg">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 font-medium text-muted-foreground w-8">#</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Certificate</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert: any) => (
                    <tr key={cert.name} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{cert.sNo}</td>
                      <td className="px-4 py-3">{cert.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{cert.status || "Available"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No certificates found.</p>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
