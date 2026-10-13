import { connection } from "next/server";
import { getRequestContainer } from "@/server/container";

export async function GET() {
  // Health must always be live: opt out of prerendering before touching the database.
  await connection();

  const report = await getRequestContainer().resolve("healthService").check();

  // Public endpoint: never expose raw error messages (they can contain hosts or usernames).
  const checks = report.checks.map(({ name, status, latencyMs }) => ({ name, status, latencyMs }));
  return Response.json({ ...report, checks }, { status: report.status === "up" ? 200 : 503 });
}
