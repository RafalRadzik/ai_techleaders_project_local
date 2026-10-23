'use client';

import { useState } from 'react';
import { Button, type ButtonProps } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { apiCall } from '../api/apiCall';
import { ErrorMessage } from '../feedback/ErrorMessage';

export interface WorkflowActionProps<T = unknown> {
  /** API path called through `apiCall`, so the CSRF header always rides along. */
  endpoint: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Optional JSON body; most workflow actions carry none. */
  body?: unknown;
  /** Visible button text, naming the outcome (e.g. "Sign out", "Approve"). */
  label: string;
  /** Button text while the request is pending; defaults to `label`. */
  pendingLabel?: string;
  /** Called with the envelope's `data` once the server reports success. */
  onSuccess?: (data: T) => void;
  /** Button emphasis; defaults to the filled primary button. */
  intent?: ButtonProps['intent'];
  appearance?: ButtonProps['appearance'];
  size?: ButtonProps['size'];
  className?: string;
}

/**
 * A button that changes server state (primitive F4) — the shape `CrudForm` and
 * `DataTable` do not cover. Posts through `apiCall`, disables itself while pending, and
 * renders a failure envelope's message with `ErrorMessage`; the caller decides what
 * success means (`onSuccess`). A confirmation step is deferred until its first consumer.
 */
export function WorkflowAction<T = unknown>({
  endpoint,
  method = 'POST',
  body,
  label,
  pendingLabel,
  onSuccess,
  intent,
  appearance,
  size,
  className,
}: WorkflowActionProps<T>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    try {
      const result = await apiCall<T>(endpoint, { method, body });
      if (result.ok) {
        onSuccess?.(result.data);
      } else {
        setError(result.error.message);
      }
    } catch {
      setError('The request could not be completed. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn('dm-workflow-action flex flex-col items-start gap-2', className)}>
      <Button
        type="button"
        intent={intent}
        appearance={appearance}
        size={size}
        disabled={pending}
        aria-busy={pending}
        onClick={run}
      >
        {pending ? (pendingLabel ?? label) : label}
      </Button>
      {error && <ErrorMessage message={error} />}
    </div>
  );
}
