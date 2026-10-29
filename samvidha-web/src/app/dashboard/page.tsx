"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Activity,
  BookOpen,
  Clock,
  FileText,
  GraduationCap,
  Image,
  User,
  BarChart2,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/Layout";

interface StatCard {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

export default function DashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("samvidha_session");
      if (stored) {
        try {
          setSession(JSON.parse(stored));
        } catch {
          setSession(null);
        }
      }
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
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
            <Button>Log in to Samvidha</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const stats: StatCard[] = [
    {
      title: "Attendance",
      value: "Live",
      description: "Trapped from Samvidha portal",
      icon: Activity,
      color: "bg-blue-500",
    },
    {
      title: "CIE Marks",
      value: "All Semesters",
      description: "Theory & Laboratory",
      icon: BookOpen,
      color: "bg-green-500",
    },
    {
      title: "Timetable",
      value: "Current Semester",
      description: "Live portal data",
      icon: Clock,
      color: "bg-purple-500",
    },
    {
      title: "Exam Results",
      value: "Available",
      description: "Grade sheets",
      icon: FileText,
      color: "bg-orange-500",
    },
    {
      title: "My Box",
      value: "PDFs & Notices",
      description: "Documents & circulars",
      icon: Image,
      color: "bg-pink-500",
    },
    {
      title: "Profile",
      value: session.username,
      description: "Student profile",
      icon: GraduationCap,
      color: "bg-indigo-500",
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.username}. Your data is fetched live from the
          Samvidha portal — no database, no storage.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-white", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-sm text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer group" onClick={() => {}}>
              <div>
                <h3 className="font-medium">Attendance</h3>
                <p className="text-sm text-muted-foreground">
                  View per-subject attendance with percentage
                </p>
              </div>
              <BarChart2 className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer group" onClick={() => {}}>
              <div>
                <h3 className="font-medium">CIE Marks</h3>
                <p className="text-sm text-muted-foreground">
                  Internal assessment marks all semesters
                </p>
              </div>
              <GraduationCap className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer group" onClick={() => {}}>
              <div>
                <h3 className="font-medium">Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Student details & certificates
                </p>
              </div>
              <User className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About this app</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This is a modern remake of the Samvidha student portal. It traps
              the portal&apos;s live endpoints and displays your attendance, marks,
              timetable, results, and PDFs — with no database and no server-side
              storage.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              All data is fetched live from{" "}
              <a
                href="https://samvidha.iare.ac.in/"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                samvidha.iare.ac.in
              </a>
              using your authenticated session.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
