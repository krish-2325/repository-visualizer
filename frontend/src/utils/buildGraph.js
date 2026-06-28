const LANG_COLORS = {
  python:     '#3572A5',
  javascript: '#f1e05a',
  typescript: '#2b7489',
  jsx:        '#61dafb',
  tsx:        '#61dafb',
  c:          '#555555',
  cpp:        '#f34b7d',
  java:       '#b07219',
  go:         '#00ADD8',
  rust:       '#dea584',
  ruby:       '#701516',
  php:        '#4F5D95',
  csharp:     '#178600',
  swift:      '#ffac45',
  kotlin:     '#A97BFF',
  markdown:   '#083fa1',
  json:       '#292929',
  yaml:       '#cb171e',
  html:       '#e34c26',
  css:        '#563d7c',
  scss:       '#c6538c',
  shell:      '#89e051',
  unknown:    '#484f58',
  directory:  '#d29922',
};

function getComplexityColor(complexity) {
  if (complexity <= 5)  return '#3fb950'; // green
  if (complexity <= 15) return '#d29922'; // yellow
  return '#f85149';                        // red
}

function getLoCSize(loc) {
  if (loc < 50)   return 36;
  if (loc < 200)  return 44;
  if (loc < 500)  return 52;
  if (loc < 1000) return 62;
  return 72;
}

const X_GAP = 260;  // horizontal gap between depth levels
const Y_GAP = 64;   // vertical gap between sibling leaves

/**
 * Lays the repository out as a tidy tree: depth controls the x position, and a
 * depth-first walk assigns y positions so that every leaf gets its own row and
 * each directory is centered on the vertical span of its children.
 *
 * Returns a map of node id -> { x, y }.
 */
function computeTreeLayout(nodeById, rootId) {
  const positions = {};
  let cursorY = 0;

  function walk(id, depth) {
    const node = nodeById[id];
    if (!node || positions[id]) return;

    if (node.type === 'directory') {
      const children = (node.children || []).filter(cid => nodeById[cid]);
      if (children.length === 0) {
        positions[id] = { x: depth * X_GAP, y: cursorY };
        cursorY += Y_GAP;
        return;
      }
      children.forEach(cid => walk(cid, depth + 1));
      const ys = children.map(cid => positions[cid].y);
      positions[id] = {
        x: depth * X_GAP,
        y: (Math.min(...ys) + Math.max(...ys)) / 2,
      };
    } else {
      positions[id] = { x: depth * X_GAP, y: cursorY };
      cursorY += Y_GAP;
    }
  }

  if (rootId) walk(rootId, 0);

  return { positions, nextY: cursorY };
}

export function buildGraphElements(rawNodes, rawEdges) {
  const nodeById = {};
  rawNodes.forEach(n => { nodeById[n.id] = n; });

  const root = rawNodes.find(n => n.id === '__root__')
    || rawNodes.find(n => n.type === 'directory' && n.depth === 0);

  const { positions, nextY } = computeTreeLayout(nodeById, root && root.id);

  // Place any node the tree walk didn't reach (orphans) below everything else.
  let cursorY = nextY;
  rawNodes.forEach(n => {
    if (!positions[n.id]) {
      positions[n.id] = { x: (n.depth || 0) * X_GAP, y: cursorY };
      cursorY += Y_GAP;
    }
  });

  const nodes = rawNodes.map(n => {
    if (n.type === 'directory') {
      const childCount = (n.children || []).length;
      return {
        id:   n.id,
        type: 'dirNode',
        position: positions[n.id],
        data: {
          label:     n.label,
          path:      n.path,
          childCount,
          color:     LANG_COLORS.directory,
          nodeSize:  40,
          isRoot:    n.depth === 0,
          raw:       n,
        },
      };
    }

    const lang  = n.language || 'unknown';
    const color = LANG_COLORS[lang] || LANG_COLORS.unknown;
    const size  = getLoCSize(n.loc || 0);

    return {
      id:   n.id,
      type: 'fileNode',
      position: positions[n.id],
      data: {
        label:      n.label,
        language:   lang,
        color,
        loc:        n.loc        || 0,
        complexity: n.complexity || 0,
        sizeBytes:  n.size_bytes || 0,
        codeLines:  n.code_lines || 0,
        path:       n.path,
        complexityColor: getComplexityColor(n.complexity || 0),
        nodeSize:   size,
        raw:        n,
      },
    };
  });

  // Containment edges: directory -> each of its children (the folder structure).
  const structureEdges = [];
  rawNodes.forEach(n => {
    if (n.type !== 'directory') return;
    (n.children || []).forEach(cid => {
      if (!nodeById[cid]) return;
      structureEdges.push({
        id:       `tree:${n.id}->${cid}`,
        source:   n.id,
        target:   cid,
        type:     'smoothstep',
        kind:     'structure',
        style:    { stroke: '#30363d', strokeWidth: 1.5, strokeDasharray: '4 4' },
      });
    });
  });

  // Dependency edges: file -> file (the imports), styled to stand out.
  const dependencyEdges = rawEdges.map(e => ({
    id:        e.id,
    source:    e.source,
    target:    e.target,
    type:      'smoothstep',
    kind:      'dependency',
    animated:  true,
    style:     { stroke: '#a371f7', strokeWidth: 1.8 },
    markerEnd: { type: 'arrowclosed', color: '#a371f7' },
  }));

  return { nodes, edges: [...structureEdges, ...dependencyEdges] };
}
