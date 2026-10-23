import Link from 'next/link';
import { describe, expect, it } from 'vitest';
import { findByType, textOf } from '../../test/element-tree';
import { SignOutButton } from '../auth/SignOutButton';
import { SignedInFrame } from './SignedInFrame';

describe('SignedInFrame', () => {
  it('renders the brand home link, the surface, sign-out and the page in <main>', () => {
    const child = <p>page body</p>;
    const tree = SignedInFrame({ surface: 'Mentor', children: child });

    const [brand] = findByType(tree, Link);
    expect(brand!.props.href).toBe('/');
    expect(textOf(brand)).toBe('DevMentor');
    expect(findByType(tree, 'p').map(textOf)).toContain('Mentor');
    expect(findByType(tree, SignOutButton)).toHaveLength(1);
    expect(findByType(tree, 'main')[0]!.props.children).toBe(child);
  });
});
