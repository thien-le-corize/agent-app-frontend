'use client';

import { Handle, Position } from 'reactflow';
import { Copy, FilePenLine, Loader2 } from 'lucide-react';
import NodeWrapper from './NodeWrapper';
import toast from 'react-hot-toast';

interface Props {
  data: {
    content?: string;
    generating?: boolean;
    status?: 'idle' | 'running' | 'done' | 'error';
    error?: string;
    onDelete?: () => void;
  };
}

export default function ContentOutputNode({ data }: Props) {
  const content = data.content || '';

  const copyContent = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    toast.success('Đã copy content');
  };

  return (
    <NodeWrapper onDelete={data.onDelete}>
      <div className="node-card nowheel" style={{ width: 360, background: '#141414', border: '1px solid #2a2a2a' }}>
        <div className="node-header" style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '8px 12px' }}>
          <FilePenLine className="h-3.5 w-3.5 text-pink-400" />
          <span className="text-[11px] font-semibold text-gray-200">Content Writer</span>
          {data.status === 'running' && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-pink-400" />}
          {data.status === 'done' && (
            <button onClick={copyContent} onPointerDown={(event) => event.stopPropagation()} className="ml-auto rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white" title="Copy">
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="p-2">
          {data.status === 'running' ? (
            <div className="rounded-lg border border-pink-500/20 bg-pink-500/5 py-8 text-center">
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-pink-400" />
              <p className="text-[11px] text-pink-200">Đang viết content...</p>
            </div>
          ) : content ? (
            <textarea
              readOnly
              value={content}
              onPointerDown={(event) => event.stopPropagation()}
              className="h-80 w-full resize-none rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-[11px] leading-relaxed text-gray-200 outline-none"
            />
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 py-8 text-center">
              <FilePenLine className="mx-auto mb-2 h-6 w-6 text-gray-700" />
              <p className="text-[10px] text-gray-600">Nhấn Run để viết content</p>
            </div>
          )}
          {data.error && <p className="mt-2 text-[10px] text-red-400">{data.error}</p>}
        </div>
        <Handle type="target" position={Position.Left} style={{ background: '#ec4899' }} />
      </div>
    </NodeWrapper>
  );
}
