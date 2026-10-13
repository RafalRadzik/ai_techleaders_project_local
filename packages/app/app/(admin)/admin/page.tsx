import { Badge } from "@devmentor/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@devmentor/ui/components/card";
import { connection } from "next/server";
import { Suspense } from "react";
import { getRequestContainer } from "@/server/container";

export const metadata = { title: "Dashboard" };

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6 md:p-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">DevMentor Admin</h1>
        <p className="text-muted-foreground text-sm">System overview</p>
      </header>
      <Suspense fallback={<StatusFallback />}>
        <SystemStatus />
      </Suspense>
    </main>
  );
}

async function SystemStatus() {
  await connection();

  const container = getRequestContainer();
  const health = await container.resolve("healthService").check();
  const userCount = health.status === "up" ? await container.resolve("userService").countUsers() : null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Health</CardTitle>
          <CardDescription>Checked at {health.checkedAt.toISOString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {health.checks.map((check) => (
              <li key={check.name} className="flex items-center justify-between gap-4 text-sm">
                <span className="flex flex-col">
                  <span className="font-medium capitalize">{check.name}</span>
                  {check.error ? <span className="text-destructive text-xs">{check.error}</span> : null}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">{check.latencyMs} ms</span>
                  <Badge variant={check.status === "up" ? "default" : "destructive"}>{check.status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Registered accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums">{userCount ?? "—"}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusFallback() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="h-36 animate-pulse" />
      <Card className="h-36 animate-pulse" />
    </div>
  );
}
