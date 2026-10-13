import Link from "next/link";
import { UsersPanel } from "./users-panel";

export const metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6 md:p-10">
      <header className="flex flex-col gap-1">
        <Link href="/admin" className="text-muted-foreground text-sm underline-offset-4 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">Registered accounts</p>
      </header>
      <UsersPanel />
    </main>
  );
}
