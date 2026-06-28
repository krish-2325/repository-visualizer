import { buildGraphElements } from './buildGraph';

// A tiny repo:  root/ -> src/ -> { a.py (imports b), b.py }
const rawNodes = [
  { id: '__root__', type: 'directory', label: 'repo', depth: 0, path: '.', children: ['src'] },
  { id: 'src', type: 'directory', label: 'src', depth: 1, path: 'src', children: ['src/a.py', 'src/b.py'] },
  { id: 'src/a.py', type: 'file', label: 'a.py', depth: 2, path: 'src/a.py', language: 'python', loc: 10, complexity: 2, size_bytes: 100, code_lines: 8, dependencies: ['b'] },
  { id: 'src/b.py', type: 'file', label: 'b.py', depth: 2, path: 'src/b.py', language: 'python', loc: 5, complexity: 1, size_bytes: 50, code_lines: 4, dependencies: [] },
];
const rawEdges = [{ id: 'src/a.py||src/b.py', source: 'src/a.py', target: 'src/b.py' }];

test('renders directory nodes and file nodes with the right types', () => {
  const { nodes } = buildGraphElements(rawNodes, rawEdges);
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

  expect(byId['__root__'].type).toBe('dirNode');
  expect(byId['src'].type).toBe('dirNode');
  expect(byId['src/a.py'].type).toBe('fileNode');
  expect(byId['src/b.py'].type).toBe('fileNode');
});

test('assigns finite positions that increase with depth', () => {
  const { nodes } = buildGraphElements(rawNodes, rawEdges);
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

  for (const n of nodes) {
    expect(Number.isFinite(n.position.x)).toBe(true);
    expect(Number.isFinite(n.position.y)).toBe(true);
  }
  // deeper nodes sit further right
  expect(byId['src'].position.x).toBeGreaterThan(byId['__root__'].position.x);
  expect(byId['src/a.py'].position.x).toBeGreaterThan(byId['src'].position.x);
});

test('builds containment edges for the folder structure', () => {
  const { edges } = buildGraphElements(rawNodes, rawEdges);
  const structure = edges.filter(e => e.kind === 'structure');
  const pairs = structure.map(e => `${e.source}->${e.target}`);

  expect(pairs).toContain('__root__->src');
  expect(pairs).toContain('src->src/a.py');
  expect(pairs).toContain('src->src/b.py');
});

test('builds dependency edges from imports, tagged distinctly', () => {
  const { edges } = buildGraphElements(rawNodes, rawEdges);
  const deps = edges.filter(e => e.kind === 'dependency');

  expect(deps).toHaveLength(1);
  expect(deps[0].source).toBe('src/a.py');
  expect(deps[0].target).toBe('src/b.py');
});
