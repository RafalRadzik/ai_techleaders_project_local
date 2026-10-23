// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiCall } from '../api/apiCall';
import type { ApiResult } from '../api/types';
import { WorkflowAction } from './WorkflowAction';

vi.mock('../api/apiCall', () => ({ apiCall: vi.fn() }));

const request = vi.mocked(apiCall);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  request.mockReset();
});

afterEach(cleanup);

describe('WorkflowAction', () => {
  it('POSTs through apiCall by default and disables itself while pending', async () => {
    const pending = deferred<ApiResult<unknown>>();
    request.mockReturnValueOnce(pending.promise);
    const onSuccess = vi.fn();
    render(<WorkflowAction endpoint="/api/auth/logout" label="Sign out" pendingLabel="Signing out…" onSuccess={onSuccess} />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    const busy = screen.getByRole('button', { name: 'Signing out…' });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    expect(busy.getAttribute('aria-busy')).toBe('true');
    expect(request).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST', body: undefined });
    expect(onSuccess).not.toHaveBeenCalled();

    pending.resolve({ ok: true, data: null });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(null));
    const idle = screen.getByRole('button', { name: 'Sign out' });
    expect((idle as HTMLButtonElement).disabled).toBe(false);
    expect(idle.getAttribute('aria-busy')).toBe('false');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the label while pending when no pending label is given', async () => {
    const pending = deferred<ApiResult<unknown>>();
    request.mockReturnValueOnce(pending.promise);
    render(<WorkflowAction endpoint="/api/x" label="Approve" />);
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect((screen.getByRole('button', { name: 'Approve' }) as HTMLButtonElement).disabled).toBe(true);
    pending.resolve({ ok: true, data: 1 });
    await waitFor(() => expect((screen.getByRole('button', { name: 'Approve' }) as HTMLButtonElement).disabled).toBe(false));
  });

  it('sends the given method and body and passes the envelope data to onSuccess', async () => {
    request.mockResolvedValueOnce({ ok: true, data: { id: 'b1', status: 'approved' } });
    const onSuccess = vi.fn();
    render(<WorkflowAction endpoint="/api/bookings/b1" method="PATCH" body={{ status: 'approved' }}
      label="Approve" intent="neutral" appearance="stroke" size="sm" className="extra" onSuccess={onSuccess} />);
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ id: 'b1', status: 'approved' }));
    expect(request).toHaveBeenCalledWith('/api/bookings/b1', { method: 'PATCH', body: { status: 'approved' } });
    expect(screen.getByRole('button', { name: 'Approve' }).closest('.dm-workflow-action')?.classList.contains('extra')).toBe(true);
  });

  it('succeeds without an onSuccess handler', async () => {
    request.mockResolvedValueOnce({ ok: true, data: null });
    render(<WorkflowAction endpoint="/api/x" label="Run" />);
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Run' }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders a failure envelope with ErrorMessage, skips onSuccess, and clears the error on retry', async () => {
    request.mockResolvedValueOnce({ ok: false, error: { code: 'forbidden', message: 'Missing x-devmentor-request header' } });
    const onSuccess = vi.fn();
    render(<WorkflowAction endpoint="/api/auth/logout" label="Sign out" onSuccess={onSuccess} />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Missing x-devmentor-request header');
    expect((screen.getByRole('button', { name: 'Sign out' }) as HTMLButtonElement).disabled).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();

    const retry = deferred<ApiResult<unknown>>();
    request.mockReturnValueOnce(retry.promise);
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.queryByRole('alert')).toBeNull();
    retry.resolve({ ok: true, data: null });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('reports an unexpected rejection as a retryable error', async () => {
    request.mockRejectedValueOnce(new Error('boom'));
    render(<WorkflowAction endpoint="/api/x" label="Run" />);
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect((await screen.findByRole('alert')).textContent).toContain('The request could not be completed. Try again.');
    expect((screen.getByRole('button', { name: 'Run' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
