import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import './DirNode.css';

function DirNode({ data, selected }) {
  const { label, childCount, isRoot, highlighted, dimmed } = data;

  return (
    <div
      className={`
        dir-node
        ${isRoot ? 'dir-node--root' : ''}
        ${selected ? 'dir-node--selected' : ''}
        ${highlighted ? 'dir-node--highlighted' : ''}
        ${dimmed ? 'dir-node--dimmed' : ''}
      `}
    >
      <Handle type="target" position={Position.Left} className="dir-node__handle" />

      <span className="dir-node__icon">{isRoot ? '⬢' : '📁'}</span>
      <span className="dir-node__label">{label}</span>
      {childCount > 0 && <span className="dir-node__count">{childCount}</span>}

      <Handle type="source" position={Position.Right} className="dir-node__handle" />
    </div>
  );
}

export default memo(DirNode);
