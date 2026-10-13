"use client";

import { userCreateSchema } from "@devmentor/core/validators";
import { apiCall } from "@devmentor/ui/backend/api/apiCall";
import { CrudForm, type CrudFormField } from "@devmentor/ui/backend/forms/CrudForm";
import { DataTable, type DataTableColumn } from "@devmentor/ui/backend/tables/DataTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@devmentor/ui/components/ui/card";
import { useEffect, useState } from "react";

/** `User` as it arrives over JSON (dates are ISO strings). */
interface UserRow {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

const fields: readonly CrudFormField<"name" | "email">[] = [
  { name: "name", label: "Name", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
];

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

const columns: readonly DataTableColumn<UserRow>[] = [
  { id: "name", header: "Name", cell: (user) => user.name, className: "font-medium" },
  { id: "email", header: "Email", cell: (user) => user.email },
  {
    id: "createdAt",
    header: "Created",
    cell: (user) => dateFormat.format(new Date(user.createdAt)),
    className: "text-muted-foreground",
  },
];

export function UsersPanel() {
  const [users, setUsers] = useState<UserRow[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadCount, setLoadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const result = await apiCall<UserRow[]>("/api/users", { signal: controller.signal });
      if (controller.signal.aborted) {
        return;
      }
      if (result.ok) {
        setUsers(result.data);
        setError(null);
      } else {
        setError(result.error.message);
      }
      setIsLoading(false);
    })();
    return () => controller.abort();
  }, [loadCount]);

  function reload() {
    setIsLoading(true);
    setError(null);
    setLoadCount((count) => count + 1);
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_2fr]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle>Add user</CardTitle>
          <CardDescription>Ctrl/⌘ + Enter to submit</CardDescription>
        </CardHeader>
        <CardContent>
          <CrudForm
            schema={userCreateSchema}
            fields={fields}
            submitLabel="Add user"
            onSubmit={(values) => apiCall<UserRow>("/api/users", { method: "POST", json: values })}
            onSuccess={(user) => setUsers((current) => [user, ...(current ?? [])])}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
          <CardDescription>Newest first</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            rows={users}
            getRowId={(user) => user.id}
            isLoading={isLoading}
            error={error}
            onRetry={reload}
            emptyTitle="No users yet"
            emptyDescription="Add the first one with the form."
          />
        </CardContent>
      </Card>
    </div>
  );
}
