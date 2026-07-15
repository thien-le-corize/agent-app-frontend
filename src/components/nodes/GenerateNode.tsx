'use client';

import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Sparkles, Loader2, Download, RefreshCw, Edit3, X, Send, Maximize2, ZoomIn } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface GenerateNodeProps {
  id: string;
  data: {
    generating?: boolean;
    results?: any[];
    onRegenerate?: (index: number, newPrompt?: string) => void;
    onDelete?: () => void;
    status?: 'idle' | 'running' | 'done' | 'error';
    lastPrompt?: string;
  };
}

function GenerateNode({ id, data }: GenerateNodeProps) {
  const { generating = false, results = [], onRegenerate, onDelete, status = 'idle', lastPrompt = '' } = data;
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const result = results.find(r => r && r.id);
  const isCompleted = result?.status === 'completed' && result?.result_url;

  return (
    <NodeWrapper onDelete={onDelete}>
      <div className="node-card nowheel" style={{ width: 280, background: '#141414', border: '1px solid #2a2a2a' }}>
        {/* Header */}
        <div className="node-header" style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '8px 12px' }}>
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-gray-200 font-semibold text-[11px]">Image Generator</span>
          {status === 'done' && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md text-emerald-400" style={{ background: 'rgba(34,197,94,0.1)' }}>✓ Done</span>}
          {status === 'running' && <Loader2 className="w-3.5 h-3.5 ml-auto animate-spin text-amber-400" />}
          {status === 'idle' && <div className="w-2 h-2 rounded-full bg-orange-500 ml-auto" />}
        </div>

        {/* Body */}
        <div className="p-0">
          {/* Idle state */}
          {status === 'idle' && !isCompleted && !generating && (
            <div className="m-2 rounded-xl py-8 text-center" style={{ border: '1px dashed #2a2a2a' }}>
              <Sparkles className="w-6 h-6 text-gray-700 mx-auto mb-2" />
              <p className="text-[10px] text-gray-600">Nhấn <span className="text-red-400 font-semibold">Run ▶</span> để tạo ảnh</p>
            </div>
          )}

          {/* Generating */}
          {generating && (
            <div className="m-2 rounded-xl py-8 text-center" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <Loader2 className="w-7 h-7 text-amber-400 animate-spin mx-auto mb-2" />
              <p className="text-[11px] text-amber-300 font-medium">Đang tạo ảnh...</p>
              <p className="text-[10px] text-gray-600 mt-0.5">GPT-Image 2.0</p>
            </div>
          )}

          {/* Result — ảnh chiếm toàn width */}
          {isCompleted && !generating && (
            <div>
              <div
                className="relative group cursor-pointer overflow-hidden"
                onClick={() => setShowPreview(true)}
                onPointerDown={e => e.stopPropagation()}
              >
                <img
                  src={result.result_url}
                  alt="Generated"
                  className="w-full object-cover"
                  style={{ maxHeight: 320 }}
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button
                      className="p-2.5 rounded-xl text-white transition hover:scale-110"
                      style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
                      title="Xem lớn"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <a
                      href={result.result_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-2.5 rounded-xl text-white transition hover:scale-110"
                      style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingIndex(0); setEditPrompt(lastPrompt); }}
                      className="p-2.5 rounded-xl text-white transition hover:scale-110"
                      style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
                      title="Sửa prompt"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRegenerate?.(0); }}
                      className="p-2.5 rounded-xl text-white transition hover:scale-110"
                      style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
                      title="Tạo lại"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Prompt excerpt dưới ảnh */}
              {lastPrompt && (
                <div className="px-3 py-2" style={{ borderTop: '1px solid #1e1e1e' }}>
                  <p className="text-[9px] text-gray-600 leading-relaxed line-clamp-2">{lastPrompt}</p>
                </div>
              )}

              {/* Edit prompt panel */}
              {editingIndex !== null && (
                <div className="m-2 mt-0 rounded-xl p-2.5 space-y-1.5" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(249,115,22,0.3)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-orange-400">Sửa prompt</span>
                    <button onPointerDown={e => e.stopPropagation()} onClick={() => setEditingIndex(null)}>
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                  <textarea
                    value={editPrompt}
                    onChange={e => setEditPrompt(e.target.value)}
                    className="w-full bg-transparent text-[10px] text-gray-300 leading-relaxed outline-none resize-none"
                    rows={3}
                    placeholder="Sửa prompt..."
                    onPointerDown={e => e.stopPropagation()}
                  />
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => { onRegenerate?.(0, editPrompt); setEditingIndex(null); }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-white text-[11px] font-medium rounded-lg hover:opacity-90 transition"
                    style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                  >
                    <Send className="w-3 h-3" /> Tạo lại
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {result?.status === 'failed' && (
            <div className="m-2 rounded-xl px-3 py-5 text-center" style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
              <p className="text-[11px] text-red-400">❌ Lỗi tạo ảnh</p>
              {result.error_message && (
                <p className="mt-1.5 text-[9px] leading-relaxed text-red-300/80 line-clamp-4" title={result.error_message}>
                  {result.error_message}
                </p>
              )}
              <button onPointerDown={e => e.stopPropagation()} onClick={() => onRegenerate?.(0)} className="nodrag mt-1.5 text-[10px] text-gray-400 hover:text-white transition">
                Thử lại →
              </button>
            </div>
          )}
        </div>

        <Handle type="target" position={Position.Left} style={{ background: '#f97316' }} />
        <Handle type="source" position={Position.Right} style={{ background: '#f97316' }} />
      </div>

      {/* Fullscreen preview */}
      {showPreview && isCompleted && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setShowPreview(false)}
          onPointerDown={e => e.stopPropagation()}
        >
          <div className="relative max-w-[85vw] max-h-[85vh]">
            <img src={result.result_url} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-3 right-3 p-2 rounded-full text-white hover:scale-110 transition"
              style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <a
                href={result.result_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 text-sm font-medium rounded-xl hover:bg-gray-100 transition"
              >
                <Download className="w-4 h-4" /> Download
              </a>
              <button
                onClick={(e) => { e.stopPropagation(); setShowPreview(false); setEditingIndex(0); setEditPrompt(lastPrompt); }}
                className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl transition hover:bg-white/20"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <Edit3 className="w-4 h-4" /> Sửa
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowPreview(false); onRegenerate?.(0); }}
                className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl transition hover:bg-white/20"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <RefreshCw className="w-4 h-4" /> Tạo lại
              </button>
            </div>
          </div>
        </div>
      )}
    </NodeWrapper>
  );
}

export default GenerateNode;
