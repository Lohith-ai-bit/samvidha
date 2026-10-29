"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("24951A05G3");
  const [password, setPassword] = useState("2241930809393212039");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const json = await res.json();

      if (!json.success || !json.session) {
        setError(json.error || "Invalid username or password.");
        setLoading(false);
        return;
      }

      // Store the session in memory only (sessionStorage — no database, no server storage)
      sessionStorage.setItem("samvidha_session", JSON.stringify(json.session));
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldAlert className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold tracking-tight">Samvidha</span>
          </div>
          <CardTitle className="text-xl">Student Portal</CardTitle>
          <CardDescription>
            Modern remake — traps Samvidha endpoints live. No database, no storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">University Roll Number</Label>
              <Input
                id="username"
                type="text"
                placeholder="e.g. 24951A05G3"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-left"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/50 p-3 text-sm text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in to Samvidha"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-center">
          <p className="text-sm text-muted-foreground">
            Your session is used only to fetch live data from{" "}
            <a
              href="https://samvidha.iare.ac.in/"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              samvidha.iare.ac.in
            </a>
            . Nothing is saved on this server.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
