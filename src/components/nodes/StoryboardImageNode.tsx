'use client';

import { Handle, Position } from 'reactflow';
import { Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface StoryboardImageNodeProps {
  data: {
    index?: number;
    imageUrl?: string;
    generating?: boolean;
    label?: string;
    onRegenerate?: () => void;
    onDelete?: () => void;
  };
}

function StoryboardImageNode({ data }: StoryboardImageNodeProps) {
  const {
    index = 0,
    imageUrl,
    generating = false,
    label,
    onRegenerate,
    onDelete,
  } = data;
  const tag = index === 0 ? '<FIRST_FRAME>' : `<IMAGE_REF_${index - 1}>`;

  return (
    <NodeWrapper onDelete={onDelete}>
      <div className="node-card nowheel" style={{ width: 220, background: '#111827', border: '1px solid #2563eb55' }}>
        <div className="node-header" style={{ background: '#172033', borderBottom: '1px solid #2563eb33', padding: '8px 10px' }}>
          <ImageIcon className="h-3.5 w-3.5 text-blue-300" />
          <span className="text-[11px] font-semibold text-gray-200">{label || `Ảnh tham chiếu ${index + 1}`}</span>
          {onRegenerate && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRegenerate();
              }}
              onPointerDown={(event) => event.stopPropagation()}
              disabled={generating}
              className="ml-auto rounded-md border border-blue-400/20 bg-blue-400/10 p-1 text-blue-200 hover:bg-blue-400/20 disabled:cursor-not-allowed disabled:opacity-50"
              title="Tạo lại storybook"
            >
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </button>
          )}
        </div>

        <div className="p-2">
          {imageUrl ? (
            <div className="overflow-hidden rounded-lg border border-blue-400/20 bg-[#0b111a]">
              <div className="aspect-video w-full overflow-hidden">
                <img src={imageUrl} alt={`Ảnh tham chiếu ${index + 1}`} className="h-full w-full object-cover" />
              </div>
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-blue-400/20 bg-[#0b111a]">
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-300" />
              ) : (
                <span className="text-[10px] text-gray-500">Chưa có ảnh</span>
              )}
            </div>
          )}
          <div className="mt-1.5 truncate rounded-md bg-blue-400/10 px-2 py-1 text-[9px] font-medium text-blue-200">
            {tag}
          </div>
        </div>

        <Handle type="target" position={Position.Left} style={{ background: '#60a5fa' }} />
        <Handle type="source" position={Position.Right} style={{ background: '#60a5fa' }} />
      </div>
    </NodeWrapper>
  );
}

export default StoryboardImageNode;
