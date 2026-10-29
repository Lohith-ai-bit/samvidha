"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";

export default function TimetablePage() {
  const [session, setSession] = useState<any>(null);
  const [data, setData] = useState<string | null>(null);
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
      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: active }),
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data.html);
      } else {
        setError(json.error || "Failed to load timetable");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <Calendar className="h-10 w-10 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">Fetching timetable from Samvidha...</p>
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

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Timetable</h1>
            <p className="text-muted-foreground">
              Current semester timetable from Samvidha portal
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

      <Card>
        <CardHeader>
          <CardTitle>Timetable</CardTitle>
        </CardHeader>
        <CardContent className="h-[600px] overflow-auto border rounded-lg bg-gray-50">
          {/* Render the portal timetable HTML inside a sandboxed div */}
          <div
            dangerouslySetInnerHTML={{
              __html: data || "<p class='text-muted-foreground text-center py-20'>No timetable data available.</p>",
            }}
          />
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Data trapped live from Samvidha portal — rendered directly.
          </p>
        </CardFooter>
      </Card>
    </DashboardLayout>
  );
}
