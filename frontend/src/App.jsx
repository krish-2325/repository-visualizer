import React, { useState, useCallback, useRef } from 'react';
import GraphCanvas from './components/GraphCanvas';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import SidePanel from './components/SidePanel';
import { analyzeRepo } from './api';
import { buildGraphElements } from './utils/buildGraph';
import './App.css';

export default function App() {
  const [repoPath, setRepoPath]         = useState('');
  const [nodes, setNodes]               = useState([]);
  const [edges, setEdges]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [stats, setStats]               = useState(null);
  const [repoRoot, setRepoRoot]         = useState('');
  const [searchQuery, setSearchQuery]   = useState('');
  const zoomToNodeRef                   = useRef(null);

  const handleAnalyze = useCallback(async (path) => {
    if (!path.trim()) return;
    setLoading(true);
    setError('');
    setSelectedNode(null);
    setNodes([]);
    setEdges([]);
    setSearchQuery('');

    try {
      const data = await analyzeRepo(path);
      const { nodes: n, edges: e } = buildGraphElements(data.nodes, data.edges);
      setNodes(n);
      setEdges(e);
      setStats(data.stats);
      setRepoRoot(path);
    } catch (err) {
      setError(err.message || 'Failed to analyze repository.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleZoomToNode = useCallback((node) => {
    setSelectedNode(node);
    if (zoomToNodeRef.current) {
      zoomToNodeRef.current(node);
    }
  }, []);

  const displayNodes = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      highlighted: searchQuery
        ? node.data.label.toLowerCase().includes(searchQuery.toLowerCase())
        : null,
      dimmed: searchQuery
        ? !node.data.label.toLowerCase().includes(searchQuery.toLowerCase())
        : false,
    }
  }));

  return (
    <div className="app-shell">
      <TopBar
        repoPath={repoPath}
        setRepoPath={setRepoPath}
        onAnalyze={handleAnalyze}
        loading={loading}
        stats={stats}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <div className="app-body">
        <Sidebar
          stats={stats}
          selectedNode={selectedNode}
          nodes={nodes}
          onZoomToNode={handleZoomToNode}
        />
        <div className="canvas-wrapper">
          {error && <div className="error-banner">{error}</div>}
          {!loading && nodes.length === 0 && !error && (
            <div className="empty-state">
              <div className="empty-icon">⬡</div>
              <h2>No repository loaded</h2>
              <p>Enter a local path or GitHub URL above and click Analyze</p>
              <code>Example: https://github.com/pallets/flask</code>
            </div>
          )}
          {loading && (
            <div className="empty-state">
              <div className="spinner" />
              <p>Scanning repository...</p>
            </div>
          )}
          {nodes.length > 0 && (
            <GraphCanvas
              nodes={displayNodes}
              edges={edges}
              setNodes={setNodes}
              setEdges={setEdges}
              onNodeClick={setSelectedNode}
              repoRoot={repoRoot}
              zoomToNodeRef={zoomToNodeRef}
            />
          )}
        </div>
        {selectedNode && (
          <SidePanel
            node={selectedNode}
            repoRoot={repoRoot}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}