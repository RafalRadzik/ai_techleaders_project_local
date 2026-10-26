// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import ApplicationError from './error';

afterEach(cleanup);

it('shows only safe unavailable feedback and retries without exposing server details', async () => {
  const error = Object.assign(new Error('database password=private credential'), {
    digest: 'private-digest',
    stack: 'private-server-stack',
  });
  const retry = vi.fn();
  const { container } = render(<ApplicationError error={error} retry={retry} />);

  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Page unavailable');
  expect(screen.getByRole('alert').textContent).toContain(
    "We couldn't load this page. Try again in a moment.",
  );
  expect(container.textContent).not.toMatch(/password|credential|digest|stack|sign.in|admin/i);
  expect(screen.queryByRole('link')).toBeNull();
  expect(retry).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledOnce();
});
