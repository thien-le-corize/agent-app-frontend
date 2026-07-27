'use client';

import { useEffect, useState } from 'react';
import { Handle, NodeResizer, Position } from 'reactflow';
import { Clapperboard, Check, Loader2 } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface StoryboardNodeProps {
  selected?: boolean;
  data: {
    storyboard?: string;
    generating?: boolean;
    status?: 'idle' | 'running' | 'done' | 'error';
    onChange?: (val: string) => void;
    onDelete?: () => void;
  };
}

function StoryboardNode({ data, selected }: StoryboardNodeProps) {
  const { storyboard = '', generating = false, status = 'idle', onChange, onDelete } = data;
  const [localStoryboard, setLocalStoryboard] = useState(storyboard);

  useEffect(() => {
    setLocalStoryboard(storyboard);
  }, [storyboard]);

  const handleChange = (value: string) => {
    setLocalStoryboard(value);
    onChange?.(value);
  };

  return (
    <NodeWrapper onDelete={onDelete} className="h-full w-full">
      <NodeResizer
        isVisible={selected}
        minWidth={320}
        minHeight={220}
        maxWidth={900}
        maxHeight={700}
        lineClassName="!border-sky-500/70"
        handleClassName="!h-4 !w-4 !border-sky-400 !bg-[#141414]"
      />
      <div
        className="node-card nowheel relative flex h-full min-h-[220px] min-w-[320px] flex-col"
        style={{ width: '100%', height: '100%', maxWidth: 'none', background: '#101620', border: '1px solid #243244' }}
      >
        <div className="node-header" style={{ background: '#141d2a', borderBottom: '1px solid #243244', padding: '8px 12px' }}>
          <Clapperboard className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-gray-200 font-semibold text-[11px]">Storybook</span>
          <div className="ml-auto flex items-center gap-1.5">
            {generating && <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />}
            {status === 'done' && <Check className="h-3.5 w-3.5 text-emerald-400" />}
            {localStoryboard.trim().length > 0 && (
              <span className="text-[9px] text-gray-500">{localStoryboard.length} chars</span>
            )}
          </div>
        </div>

        <textarea
          value={localStoryboard}
          onChange={(event) => handleChange(event.target.value)}
          className="h-full min-h-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-[11px] leading-relaxed text-sky-100/80 outline-none"
          placeholder="Storybook sẽ được OpenAI tạo theo từng ảnh đầu vào..."
          onPointerDown={(event) => event.stopPropagation()}
        />

        {!localStoryboard.trim() && !generating && (
          <div className="px-3 pb-2.5">
            <p className="text-[9px] text-gray-500">Nối Prompt + nhiều ảnh đầu vào, rồi nhấn Run.</p>
          </div>
        )}

        <Handle type="target" position={Position.Left} style={{ background: '#38bdf8' }} />
        <Handle type="source" position={Position.Right} style={{ background: '#38bdf8' }} />
      </div>
    </NodeWrapper>
  );
}

export default StoryboardNode;
