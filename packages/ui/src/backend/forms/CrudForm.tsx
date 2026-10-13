"use client";

import type { ApiResult, FieldErrors } from "@devmentor/shared";
import { Button } from "@devmentor/ui/components/ui/button";
import { Input } from "@devmentor/ui/components/ui/input";
import { Label } from "@devmentor/ui/components/ui/label";
import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { z } from "zod";

type FieldName<TSchema extends z.ZodObject> = Extract<keyof z.input<TSchema>, string>;
export type CrudFormValues<TSchema extends z.ZodObject> = Partial<Record<FieldName<TSchema>, string>>;

export interface CrudFormField<TName extends string = string> {
  name: TName;
  label: string;
  type?: "text" | "email" | "number" | "password" | "url" | "tel";
  placeholder?: string;
  autoComplete?: string;
  description?: string;
}

interface CrudFormProps<TSchema extends z.ZodObject, TData> {
  /** The same Zod schema the route handler validates with. */
  schema: TSchema;
  fields: readonly CrudFormField<FieldName<TSchema>>[];
  initialValues?: CrudFormValues<TSchema>;
  submitLabel?: string;
  /** Usually an `apiCall`; server `fieldErrors` are shown next to their fields. */
  onSubmit: (values: z.output<TSchema>) => Promise<ApiResult<TData>>;
  onSuccess?: (data: TData) => void;
  /** Renders a cancel button and enables `Escape`. */
  onCancel?: () => void;
}

/**
 * Schema-driven create/edit form. Validates on the client with the shared schema, then
 * submits. `Cmd/Ctrl+Enter` submits, `Escape` cancels. Resets to `initialValues` on success.
 */
export function CrudForm<TSchema extends z.ZodObject, TData>({
  schema,
  fields,
  initialValues = {},
  submitLabel = "Save",
  onSubmit,
  onSuccess,
  onCancel,
}: CrudFormProps<TSchema, TData>) {
  const idPrefix = useId();
  const [values, setValues] = useState<CrudFormValues<TSchema>>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    // Inputs are strings: untouched fields are validated as "" so the schema's own messages apply.
    const parsed = schema.safeParse(Object.fromEntries(fields.map((field) => [field.name, values[field.name] ?? ""])));
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(z.flattenError(parsed.error).fieldErrors));
      setFormError(null);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmit(parsed.data);
      if (!result.ok) {
        setFieldErrors(result.error.fieldErrors ?? {});
        setFormError(result.error.message);
        return;
      }
      setValues(initialValues);
      setFieldErrors({});
      setFormError(null);
      onSuccess?.(result.data);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
      return;
    }
    if (event.key === "Escape" && onCancel) {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col gap-4">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.name}`;
        const errors = fieldErrors[field.name] ?? [];
        const hintId = `${id}-hint`;
        const hasHint = errors.length > 0 || field.description !== undefined;
        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            <Label htmlFor={id}>{field.label}</Label>
            <Input
              id={id}
              name={field.name}
              type={field.type ?? "text"}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              value={values[field.name] ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
              aria-invalid={errors.length > 0 || undefined}
              aria-describedby={hasHint ? hintId : undefined}
              disabled={isSubmitting}
            />
            {errors.length > 0 ? (
              <p id={hintId} className="text-destructive text-xs">
                {errors.join(" ")}
              </p>
            ) : field.description ? (
              <p id={hintId} className="text-muted-foreground text-xs">
                {field.description}
              </p>
            ) : null}
          </div>
        );
      })}
      {formError ? (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function toFieldErrors(errors: Partial<Record<string, string[]>>): FieldErrors {
  return Object.fromEntries(
    Object.entries(errors).filter((entry): entry is [string, string[]] => entry[1] !== undefined),
  );
}
