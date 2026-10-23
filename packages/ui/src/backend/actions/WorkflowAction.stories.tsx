import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { delay, http, HttpResponse } from 'msw';
import { WorkflowAction, type WorkflowActionProps } from './WorkflowAction';

const endpoint = (scenario: string) => `/storybook-api/workflow/${scenario}`;
// A unique URL per scenario keeps each example's mock response independent on the Docs page.
const handlers = [
  http.post(endpoint('pending'), async () => { await delay(2500); return HttpResponse.json({ ok: true, data: null }); }),
  http.post(endpoint('error'), () => HttpResponse.json({ ok: false, error: { code: 'conflict', message: 'This session has already been approved.' } }, { status: 409 })),
  http.post(endpoint('network'), () => HttpResponse.error()),
  http.post('/storybook-api/workflow/:scenario', () => HttpResponse.json({ ok: true, data: null })),
];

const meta = {
  title: 'Backend/Actions/WorkflowAction', component: WorkflowAction, tags: ['autodocs'],
  args: { endpoint: endpoint('success'), label: 'Sign out', pendingLabel: 'Signing out…', onSuccess: fn() },
  parameters: {
    msw: { handlers },
    controls: { exclude: ['endpoint', 'method', 'body', 'onSuccess'] },
    docs: { description: { component: 'A button that changes server state, such as sign out, approve or cancel. It calls the API with the request header the server requires, is disabled while the request runs, and shows the server message when the request fails. The caller decides what happens on success; sign out performs a full page load so no signed-in content remains. Stories use local mock responses.' } },
  },
} satisfies Meta<WorkflowActionProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Secondary: Story = { args: { label: 'Decline', pendingLabel: 'Declining…', intent: 'neutral', appearance: 'stroke' } };
export const Pending: Story = {
  args: { endpoint: endpoint('pending') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Sign out' }));
    await expect(canvas.getByRole('button', { name: 'Signing out…' })).toBeDisabled();
  },
};
export const Success: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(args.onSuccess).toHaveBeenCalledWith(null));
    await expect(canvas.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  },
};
export const ServerError: Story = {
  args: { endpoint: endpoint('error'), label: 'Approve', pendingLabel: 'Approving…' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Approve' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('This session has already been approved.');
  },
};
export const NetworkError: Story = {
  args: { endpoint: endpoint('network') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Sign out' }));
    await expect(await canvas.findByText(/failed to fetch|network.*(?:error|failed)|load failed/i)).toBeVisible();
  },
};
