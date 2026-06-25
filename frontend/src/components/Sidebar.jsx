import React, { useState } from 'react';
import './Sidebar.css';

const LANG_BADGE_COLORS = {
  python:     '#3572A5',
  javascript: '#f1e05a',
  typescript: '#2b7489',
  go:         '#00ADD8',
  rust:       '#dea584',
  java:       '#b07219',
  cpp:        '#f34b7d',
  c:          '#555555',
  html:       '#e34c26',
  css:        '#563d7c',
};

export default function Sidebar({ stats, selectedNode, nodes, onZoomToNode }) {
  const [fileSearch, setFileSearch] = useState('');

  const fileNodes = (nodes || []).filter(n => n.data?.language !== undefined);

  const filtered = fileNodes.filter(n =>
    n.data.label.toLowerCase().includes(fileSearch.toLowerCase())
  );

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-title">Legend</div>
        <div className="legend-list">
          {Object.entries(LANG_BADGE_COLORS).map(([lang, color]) => (
            <div className="legend-item" key={lang}>
              <span className="legend-dot" style={{ background: color }} />
              <span>{lang}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-title">Complexity</div>
        <div className="legend-list">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#3fb950' }} />
            <span>Low (≤ 5)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#d29922' }} />
            <span>Medium (6–15)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#f85149' }} />
            <span>High ({'>'} 15)</span>
          </div>
        </div>
      </div>

      {selectedNode && (
        <div className="sidebar-section">
          <div className="sidebar-title">Selected File</div>
          <div className="selected-meta">
            <div className="meta-row">
              <span className="meta-label">Name</span>
              <span className="meta-value">{selectedNode.data?.label}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Language</span>
              <span className="meta-value">{selectedNode.data?.language}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Lines</span>
              <span className="meta-value">{selectedNode.data?.loc}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Complexity</span>
              <span
                className="meta-value"
                style={{ color: selectedNode.data?.complexityColor }}
              >
                {selectedNode.data?.complexity}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Size</span>
              <span className="meta-value">
                {(selectedNode.data?.sizeBytes / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
        </div>
      )}

      {fileNodes.length > 0 && (
        <div className="sidebar-section sidebar-section--files">
          <div className="sidebar-title">Files ({fileNodes.length})</div>
          <input
            className="sidebar-file-search"
            type="text"
            placeholder="Filter files..."
            value={fileSearch}
            onChange={e => setFileSearch(e.target.value)}
          />
          <div className="sidebar-file-list">
            {filtered.map(node => (
              <div
                key={node.id}
                className={`sidebar-file-item ${selectedNode?.id === node.id ? 'sidebar-file-item--active' : ''}`}
                onClick={() => onZoomToNode(node)}
                title={node.data.path}
              >
                <span
                  className="sidebar-file-dot"
                  style={{ background: node.data.color }}
                />
                <span className="sidebar-file-name">{node.data.label}</span>
                <span
                  className="sidebar-file-complexity"
                  style={{ color: node.data.complexityColor }}
                >
                  {node.data.complexity}
                </span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="sidebar-file-empty">No files match</div>
            )}
          </div>
        </div>
      )}

      <div className="sidebar-hint">
        Click any node or file to view details and AI explanation
      </div>
    </div>
  );
}