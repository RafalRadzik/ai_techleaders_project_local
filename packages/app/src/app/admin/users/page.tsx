import { requirePageRole } from "../../../lib/session";
import { UsersTable } from "./UsersTable";

export const dynamic = "force-dynamic";

/**
 * `/admin/users` — operator only. The guard runs here as well as in the admin layout,
 * because the layout does not re-run on client-side navigation; `UserService.list` is
 * the third check behind `/api/users`.
 */
export default async function UsersPage() {
  await requirePageRole("operator", "/admin/users");
  return <UsersTable />;
}
