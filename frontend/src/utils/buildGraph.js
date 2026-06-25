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
  directory:  '#21262d',
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

export function buildGraphElements(rawNodes, rawEdges) {
  const fileNodes = rawNodes.filter(n => n.type === 'file');
  const dirNodes  = rawNodes.filter(n => n.type === 'directory');

  // Group files by parent directory
  const dirMap = {};
  dirNodes.forEach(d => { dirMap[d.id] = d; });

  // Assign positions using a simple grid layout per depth level
  const depthBuckets = {};
  fileNodes.forEach(n => {
    const d = n.depth || 0;
    depthBuckets[d] = depthBuckets[d] || [];
    depthBuckets[d].push(n);
  });

  const nodes = [];
  const X_GAP = 220;
  const Y_GAP = 110;

  Object.entries(depthBuckets).forEach(([depth, group]) => {
    const col = parseInt(depth);
    group.forEach((n, i) => {
      const lang  = n.language || 'unknown';
      const color = LANG_COLORS[lang] || LANG_COLORS.unknown;
      const size  = getLoCSize(n.loc || 0);

      nodes.push({
        id:   n.id,
        type: 'fileNode',
        position: {
          x: col * X_GAP + (i % 2 === 0 ? 0 : 30),
          y: i * Y_GAP,
        },
        data: {
          label:      n.label,
          language:   lang,
          color,
          loc:        n.loc       || 0,
          complexity: n.complexity || 0,
          sizeBytes:  n.size_bytes || 0,
          codeLines:  n.code_lines || 0,
          path:       n.path,
          complexityColor: getComplexityColor(n.complexity || 0),
          nodeSize:   size,
          raw:        n,
        },
      });
    });
  });

  const edges = rawEdges.map(e => ({
    id:           e.id,
    source:       e.source,
    target:       e.target,
    type:         'smoothstep',
    animated:     false,
    style:        { stroke: '#30363d', strokeWidth: 1.5 },
    markerEnd:    { type: 'arrowclosed', color: '#30363d' },
  }));

  return { nodes, edges };
}