'use client';

import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Video, Loader2, Play, Download, X } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface VideoNodeProps {
  data: {
    prompt?: string;
    imageUrl?: string;
    generating?: boolean;
    result?: { status: string; video_url?: string; error_message?: string };
    onGenerate?: (videoPrompt: string) => void;
    onDelete?: () => void;
    canGenerate?: boolean;
  };
}

function VideoNode({ data }: VideoNodeProps) {
  const { imageUrl, generating = false, result, onGenerate, onDelete, canGenerate = false } = data;
  const [localPrompt, setLocalPrompt] = useState(data.prompt || '');
  const [showVideo, setShowVideo] = useState(false);

  const isCompleted = result?.status === 'completed' && result?.video_url;

  return (
    <NodeWrapper onDelete={onDelete}>
      <div className="node-card nowheel" style={{ width: 260, background: '#141414', border: '1px solid #2a2a2a' }}>
        {/* Header */}
        <div className="node-header" style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '8px 12px' }}>
          <Video className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-gray-200 font-semibold text-[11px]">Google Omni Video</span>
          {generating && <Loader2 className="w-3.5 h-3.5 ml-auto animate-spin text-rose-400" />}
          {isCompleted && <span className="ml-auto text-[10px] text-emerald-400">✓ Done</span>}
        </div>

        <div className="p-0">
          {/* Textarea prompt */}
          <textarea
            value={localPrompt}
            onChange={e => setLocalPrompt(e.target.value)}
            className="w-full bg-transparent text-[11px] text-gray-300 leading-relaxed outline-none resize-none px-3 py-2.5"
            style={{ minHeight: 64, borderBottom: '1px solid #1e1e1e' }}
            placeholder="Mô tả video muốn tạo..."
            onPointerDown={e => e.stopPropagation()}
          />

          {/* Input image preview */}
          {imageUrl && (
            <div className="relative overflow-hidden" style={{ maxHeight: 120, borderBottom: '1px solid #1e1e1e' }}>
              <img src={imageUrl} alt="Input" className="w-full object-cover" style={{ maxHeight: 120 }} />
              <div className="absolute inset-0 flex items-end p-2" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                <span className="text-[9px] text-gray-400">Input từ Generate node</span>
              </div>
            </div>
          )}

          {/* Generating */}
          {generating && (
            <div className="m-2 rounded-xl py-6 text-center" style={{ background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.15)' }}>
              <Loader2 className="w-6 h-6 text-rose-400 animate-spin mx-auto" />
              <p className="text-[10px] text-rose-300 mt-2 font-medium">Đang tạo video...</p>
              <p className="text-[9px] text-gray-600 mt-0.5">Google Gemini/Omni · đang xử lý</p>
            </div>
          )}

          {/* Video result */}
          {isCompleted && !generating && (
            <div>
              <div
                className="relative group cursor-pointer overflow-hidden"
                onClick={() => setShowVideo(true)}
                onPointerDown={e => e.stopPropagation()}
              >
                <video src={result!.video_url} className="w-full object-cover" muted style={{ maxHeight: 200 }} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button className="p-2.5 rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                      <Play className="w-4 h-4" />
                    </button>
                    <a href={result!.video_url} download onClick={e => e.stopPropagation()} className="p-2.5 rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Failed */}
          {result?.status === 'failed' && (
            <div className="m-2 rounded-xl py-4 text-center" style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
              <p className="text-[11px] text-red-400">❌ {result.error_message || 'Thất bại'}</p>
            </div>
          )}

          {/* Run button */}
          <div className="p-2">
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => onGenerate?.(localPrompt)}
              disabled={generating}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold text-white transition disabled:opacity-60"
              style={{ background: generating ? '#9f1239' : 'linear-gradient(135deg, #e11d48, #be123c)' }}
            >
              {generating ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tạo...</>
              ) : (
                <><Play className="w-3.5 h-3.5" /> Tạo Video</>
              )}
            </button>
          </div>
        </div>

        <Handle type="target" position={Position.Left} style={{ background: '#f43f5e' }} />
        <Handle type="source" position={Position.Right} style={{ background: '#f43f5e' }} />
      </div>

      {/* Video fullscreen */}
      {showVideo && isCompleted && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setShowVideo(false)}
          onPointerDown={e => e.stopPropagation()}
        >
          <div className="relative max-w-[80vw]">
            <video src={result!.video_url} className="max-w-full max-h-[80vh] rounded-xl" controls autoPlay />
            <button onClick={() => setShowVideo(false)} className="absolute top-3 right-3 p-2 rounded-full text-white" style={{ background: 'rgba(0,0,0,0.6)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </NodeWrapper>
  );
}

export default VideoNode;
