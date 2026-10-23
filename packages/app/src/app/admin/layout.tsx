import type { ReactNode } from "react";
import { signedInShell } from "../../components/shell/signed-in-shell";
import { requirePageRole } from "../../lib/session";

export const dynamic = "force-dynamic";

/**
 * Admin/backend surface inside `AppShell`; pages under `/admin` use shadcn-ui components
 * from `@devmentor/ui`. Operator only: it guards before rendering, and every page beneath
 * guards again (a layout does not re-run on client-side navigation).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePageRole("operator", "/admin");
  return signedInShell("operator", "/admin", children);
}
