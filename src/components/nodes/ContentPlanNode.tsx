'use client';

import { Handle, Position } from 'reactflow';
import { CalendarDays } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface Props {
  data: {
    text?: string;
    onChange?: (value: string) => void;
    onDelete?: () => void;
  };
}

export default function ContentPlanNode({ data }: Props) {
  return (
    <NodeWrapper onDelete={data.onDelete}>
      <div className="node-card nowheel" style={{ width: 280, background: '#111827', border: '1px solid #1d4ed8' }}>
        <div className="node-header" style={{ background: '#0f172a', borderBottom: '1px solid #1d4ed8', padding: '8px 12px' }}>
          <CalendarDays className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-[11px] font-semibold text-blue-100">Plan MKT</span>
        </div>
        <textarea
          value={data.text || ''}
          onChange={(event) => data.onChange?.(event.target.value)}
          onPointerDown={(event) => event.stopPropagation()}
          className="h-32 w-full resize-none bg-transparent px-3 py-2.5 text-[11px] leading-relaxed text-blue-100/80 outline-none"
          placeholder="Mục tiêu, tệp khách, offer, lịch campaign, kênh đăng..."
        />
        <Handle type="target" position={Position.Left} style={{ background: '#3b82f6' }} />
        <Handle type="source" position={Position.Right} style={{ background: '#3b82f6' }} />
      </div>
    </NodeWrapper>
  );
}
