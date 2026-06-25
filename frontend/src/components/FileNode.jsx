import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import './FileNode.css';

function FileNode({ data, selected }) {
  const { label, language, color, loc, complexity, complexityColor, nodeSize, highlighted, dimmed } = data;

  return (
    <div
      className={`
        file-node
        ${selected ? 'file-node--selected' : ''}
        ${highlighted ? 'file-node--highlighted' : ''}
        ${dimmed ? 'file-node--dimmed' : ''}
      `}
      style={{
        '--node-color': color,
        '--complexity-color': complexityColor,
        width: nodeSize,
        height: nodeSize,
      }}
    >
      <Handle type="target" position={Position.Left} className="file-node__handle" />

      <div className="file-node__ring" />

      <div className="file-node__inner">
        <div className="file-node__lang-dot" style={{ background: color }} />
      </div>

      <div className="file-node__tooltip">
        <div className="tooltip-name">{label}</div>
        <div className="tooltip-row">
          <span className="tooltip-label">Lang</span>
          <span className="tooltip-value" style={{ color }}>{language}</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">LoC</span>
          <span className="tooltip-value">{loc}</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Complexity</span>
          <span className="tooltip-value" style={{ color: complexityColor }}>{complexity}</span>
        </div>
      </div>

      <div className="file-node__label">{label}</div>

      <Handle type="source" position={Position.Right} className="file-node__handle" />
    </div>
  );
}

export default memo(FileNode);