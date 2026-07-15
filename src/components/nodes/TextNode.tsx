'use client';

import { Handle, Position } from 'reactflow';
import { StickyNote } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface TextNodeProps {
  data: {
    text?: string;
    onChange?: (val: string) => void;
    onDelete?: () => void;
  };
}

function TextNode({ data }: TextNodeProps) {
  const { text = '', onChange, onDelete } = data;

  return (
    <NodeWrapper onDelete={onDelete}>
      <div className="node-card nowheel" style={{ width: 200, background: '#1a1800', border: '1px solid #2a2600' }}>
        {/* Header */}
        <div className="node-header" style={{ background: '#1e1c00', borderBottom: '1px solid #2a2600', padding: '7px 10px' }}>
          <StickyNote className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-yellow-200/80 font-medium text-[11px]">Văn bản</span>
        </div>
        <textarea
          value={text}
          onChange={e => onChange?.(e.target.value)}
          className="w-full bg-transparent text-[11px] text-yellow-100/70 leading-relaxed outline-none resize-none px-3 py-2.5"
          style={{ minHeight: 80 }}
          placeholder="Nội dung sẽ được thêm vào prompt..."
          onPointerDown={e => e.stopPropagation()}
        />
        <Handle type="target" position={Position.Left} style={{ background: '#eab308' }} />
        <Handle type="source" position={Position.Right} style={{ background: '#eab308' }} />
      </div>
    </NodeWrapper>
  );
}

export default TextNode;
