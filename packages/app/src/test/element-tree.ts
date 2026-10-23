// Test-only helpers for server components, which are tested by invoking them and walking
// the returned element tree (AGENTS.md, "Component tests"). Nothing here renders: nested
// function components stay unexpanded, so a test asserts on the props this file passed.
import { isValidElement, type ReactElement, type ReactNode } from 'react';

type AnyElement = ReactElement<Record<string, unknown>>;

function childrenOf(node: unknown): unknown[] {
  if (Array.isArray(node)) return node;
  if (isValidElement(node)) {
    // Elements in other slots (e.g. `footer`) are part of the tree too.
    return Object.entries(node.props as Record<string, unknown>)
      .filter(([key, value]) => key === 'children' || isValidElement(value))
      .map(([, value]) => value);
  }
  return [];
}

/** Every element in the tree, depth first, including those passed in non-children props. */
export function allElements(node: ReactNode): AnyElement[] {
  const found: AnyElement[] = [];
  const visit = (current: unknown) => {
    if (isValidElement(current)) found.push(current as AnyElement);
    for (const child of childrenOf(current)) visit(child);
  };
  visit(node);
  return found;
}

/** Elements of a given type: a component function or an intrinsic tag name. */
export function findByType(node: ReactNode, type: unknown): AnyElement[] {
  return allElements(node).filter((element) => element.type === type);
}

/** The literal text of an element's own `children`, concatenated depth first. */
export function textOf(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf((node.props as { children?: unknown }).children);
  return '';
}
