import { describe, expect, it } from 'vitest';
import { AuthLayout, ErrorMessage } from '@devmentor/ui/backend';
import { findByType } from '../../../test/element-tree';
import { VerifyEmailForm } from './VerifyEmailForm';
import VerifyEmailPage, { metadata } from './page';

describe('/verify-email', () => {
  it('renders password completion without verification or session work', async () => {
    const tree = await VerifyEmailPage({ searchParams: Promise.resolve({ token: 'emailed-token' }) });
    const [layout] = findByType(tree, AuthLayout);
    expect(layout!.props.title).toBe('Set your password');
    expect(layout!.props.description).toContain('Submitting this form confirms your email address');
    expect(findByType(tree, VerifyEmailForm)[0]!.props).toEqual({ token: 'emailed-token' });
    expect(findByType(tree, ErrorMessage)).toHaveLength(0);
    expect(metadata.referrer).toBe('no-referrer');
  });

  it('uses the first token when the query parameter is repeated', async () => {
    const tree = await VerifyEmailPage({ searchParams: Promise.resolve({ token: ['first', 'second'] }) });
    expect(findByType(tree, VerifyEmailForm)[0]!.props.token).toBe('first');
  });

  it.each([undefined, ''])('shows recovery feedback for a missing token (%s)', async (token) => {
    const tree = await VerifyEmailPage({ searchParams: Promise.resolve({ token }) });
    expect(findByType(tree, VerifyEmailForm)).toHaveLength(0);
    expect(findByType(tree, ErrorMessage)[0]!.props.message).toContain('register again');
  });
});
