'use client';

import { Handle, Position } from 'reactflow';
import { ClipboardList } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface Props {
  data: {
    text?: string;
    onChange?: (value: string) => void;
    onDelete?: () => void;
  };
}

export default function ContentGuidelineNode({ data }: Props) {
  return (
    <NodeWrapper onDelete={data.onDelete}>
      <div className="node-card nowheel" style={{ width: 280, background: '#18130b', border: '1px solid #92400e' }}>
        <div className="node-header" style={{ background: '#1f1608', borderBottom: '1px solid #92400e', padding: '8px 12px' }}>
          <ClipboardList className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[11px] font-semibold text-amber-100">Guideline</span>
        </div>
        <textarea
          value={data.text || ''}
          onChange={(event) => data.onChange?.(event.target.value)}
          onPointerDown={(event) => event.stopPropagation()}
          className="h-32 w-full resize-none bg-transparent px-3 py-2.5 text-[11px] leading-relaxed text-amber-100/80 outline-none"
          placeholder="Tone giọng, từ nên dùng/tránh, cấu trúc bài, quy định pháp lý..."
        />
        <Handle type="target" position={Position.Left} style={{ background: '#f59e0b' }} />
        <Handle type="source" position={Position.Right} style={{ background: '#f59e0b' }} />
      </div>
    </NodeWrapper>
  );
}
