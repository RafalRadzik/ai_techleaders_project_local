/**
 * Negative assertions over an agent-browser accessibility snapshot (primitive F7).
 *
 * "X must not be on the page" passes trivially against a page that failed to render, so
 * `expectAbsent` refuses to pass vacuously: the region it searches must exist and hold at
 * least one node (or, with `within.mustContain`, at least one node of the given role).
 */

/** One line of `agent-browser snapshot`, e.g. `- link "Home" [ref=e4]`. */
export interface SnapshotNode {
  depth: number;
  role: string;
  name: string;
  line: string;
}

export interface AbsenceScope {
  /** Role of the subtree root to search, e.g. `navigation`. */
  role: string;
  /** Accessible name of that root, e.g. `Workspace navigation`. */
  name?: string | RegExp;
  /** The scope must contain at least one descendant with this role (default: any node). */
  mustContain?: string;
}

export interface AbsenceQuery {
  /** Node role that must not appear (combined with `text`: a node of that role and name). */
  role?: string;
  /** Accessible name or static text that must not appear. */
  text?: string | RegExp;
  /** Restrict the search to one subtree, which must itself exist and be non-empty. */
  within?: AbsenceScope;
}

const NODE_LINE = /^(\s*)- ([^\s":]+)(?: "((?:[^"\\]|\\.)*)")?/;

/** Parse an agent-browser snapshot into its nodes, keeping indentation as depth. */
export function parseSnapshot(snapshot: string): SnapshotNode[] {
  return snapshot.split('\n').flatMap((line) => {
    const match = NODE_LINE.exec(line);
    const [, indent, role, name] = match ?? [];
    if (indent === undefined || role === undefined) return [];
    return [
      {
        depth: indent.length,
        role,
        name: (name ?? '').replace(/\\(.)/g, '$1'),
        line: line.trim(),
      },
    ];
  });
}

function matches(value: string, pattern: string | RegExp): boolean {
  return typeof pattern === 'string' ? value.includes(pattern) : pattern.test(value);
}

function describeQuery(query: AbsenceQuery): string {
  const parts = [
    query.role ? `role ${query.role}` : undefined,
    query.text ? `text ${String(query.text)}` : undefined,
  ].filter(Boolean);
  const scope = query.within
    ? ` within ${query.within.role}${query.within.name ? ` ${String(query.within.name)}` : ''}`
    : '';
  return `${parts.join(' + ')}${scope}`;
}

/** The descendants of the first node matching `scope`, or `undefined` when none does. */
export function subtreeOf(nodes: SnapshotNode[], scope: AbsenceScope): SnapshotNode[] | undefined {
  const rootIndex = nodes.findIndex(
    (node) =>
      node.role === scope.role && (scope.name === undefined || matches(node.name, scope.name)),
  );
  const root = nodes[rootIndex];
  if (!root) return undefined;
  const descendants: SnapshotNode[] = [];
  for (const node of nodes.slice(rootIndex + 1)) {
    if (node.depth <= root.depth) break;
    descendants.push(node);
  }
  return descendants;
}

/**
 * Assert that nothing in `snapshot` matches `query`. Throws (failing the test) when a
 * match is found **or** when the searched region is missing or empty, so an absence can
 * only be proven against a tree that actually rendered.
 */
export function expectAbsent(snapshot: string, query: AbsenceQuery): void {
  if (query.role === undefined && query.text === undefined) {
    throw new Error('expectAbsent needs a role, a text, or both');
  }
  const all = parseSnapshot(snapshot);
  let searched = all;

  if (query.within) {
    const scoped = subtreeOf(all, query.within);
    if (scoped === undefined) {
      throw new Error(
        `expectAbsent(${describeQuery(query)}): no ${query.within.role} ${String(query.within.name ?? '')} in the snapshot, so absence would pass vacuously:\n${snapshot}`,
      );
    }
    searched = scoped;
  }

  const required = query.within?.mustContain;
  const precondition = required
    ? searched.some((node) => node.role === required)
    : searched.length > 0;
  if (!precondition) {
    throw new Error(
      `expectAbsent(${describeQuery(query)}): the searched tree has no ${required ?? 'nodes'}, so absence would pass vacuously:\n${snapshot}`,
    );
  }

  const offending = searched.filter(
    (node) =>
      (query.role === undefined || node.role === query.role) &&
      (query.text === undefined || matches(node.name, query.text)),
  );
  if (offending.length > 0) {
    throw new Error(
      `expectAbsent(${describeQuery(query)}) found ${offending.length} match(es):\n${offending.map((node) => `  ${node.line}`).join('\n')}`,
    );
  }
}
