'use client';

import { Handle, Position } from 'reactflow';
import { MessageSquareText } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface Props {
  data: {
    text?: string;
    contentType?: 'facebook_ad' | 'daily_post' | 'video_script';
    onChange?: (value: string) => void;
    onTypeChange?: (value: 'facebook_ad' | 'daily_post' | 'video_script') => void;
    onDelete?: () => void;
  };
}

export default function ContentBriefNode({ data }: Props) {
  return (
    <NodeWrapper onDelete={data.onDelete}>
      <div className="node-card nowheel" style={{ width: 320, background: '#101615', border: '1px solid #047857' }}>
        <div className="node-header" style={{ background: '#0b1f1a', borderBottom: '1px solid #047857', padding: '8px 12px' }}>
          <MessageSquareText className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold text-emerald-100">Brief content</span>
          <select
            value={data.contentType || 'facebook_ad'}
            onChange={(event) => data.onTypeChange?.(event.target.value as any)}
            onPointerDown={(event) => event.stopPropagation()}
            className="ml-auto rounded-md border border-emerald-500/25 bg-black/30 px-1.5 py-1 text-[9px] text-emerald-100 outline-none"
          >
            <option value="facebook_ad">Quảng cáo FB</option>
            <option value="daily_post">Daily post</option>
            <option value="video_script">Video</option>
          </select>
        </div>
        <textarea
          value={data.text || ''}
          onChange={(event) => data.onChange?.(event.target.value)}
          onPointerDown={(event) => event.stopPropagation()}
          className="h-36 w-full resize-none bg-transparent px-3 py-2.5 text-[11px] leading-relaxed text-emerald-100/80 outline-none"
          placeholder="VD: Viết bài quảng cáo niềng răng cho khách 25-35 tuổi, nhấn mạnh trả góp..."
        />
        <Handle type="target" position={Position.Left} style={{ background: '#10b981' }} />
        <Handle type="source" position={Position.Right} style={{ background: '#10b981' }} />
      </div>
    </NodeWrapper>
  );
}
