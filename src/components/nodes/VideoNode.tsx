'use client';

import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Video, Loader2, Play, Download, X } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface VideoNodeProps {
  data: {
    prompt?: string;
    aspectRatio?: '16:9' | '9:16';
    durationSeconds?: number;
    voiceStyle?: string;
    videoStyle?: 'tvc' | 'intro';
    imageUrl?: string;
    generating?: boolean;
    result?: { status: string; video_url?: string; error_message?: string };
    onGenerate?: (options: {
      prompt: string;
      aspectRatio: '16:9' | '9:16';
      durationSeconds: number;
      voiceStyle: string;
      videoStyle: 'tvc' | 'intro';
    }) => void;
    onOptionsChange?: (options: {
      aspectRatio: '16:9' | '9:16';
      durationSeconds: number;
      voiceStyle: string;
      videoStyle: 'tvc' | 'intro';
    }) => void;
    onDelete?: () => void;
    canGenerate?: boolean;
  };
}

function VideoNode({ data }: VideoNodeProps) {
  const { imageUrl, generating = false, result, onGenerate, onDelete, canGenerate = false } = data;
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>(data.aspectRatio || '16:9');
  const [durationSeconds, setDurationSeconds] = useState(data.durationSeconds || 10);
  const [voiceStyle, setVoiceStyle] = useState(data.voiceStyle || 'Vietnamese female voice, warm Northern accent');
  const [videoStyle, setVideoStyle] = useState<'tvc' | 'intro'>(data.videoStyle || 'tvc');
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
          <div className="grid grid-cols-2 gap-2 px-2 py-2" style={{ borderBottom: '1px solid #1e1e1e' }}>
            <div>
              <label className="block text-[9px] text-gray-600 mb-1">Tỷ lệ</label>
              <select
                value={aspectRatio}
                onChange={(e) => {
                  const next = e.target.value as '16:9' | '9:16';
                  setAspectRatio(next);
                  data.onOptionsChange?.({ aspectRatio: next, durationSeconds, voiceStyle, videoStyle });
                }}
                className="w-full rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] px-2 py-1.5 text-[10px] text-gray-300 outline-none"
                onPointerDown={e => e.stopPropagation()}
              >
                <option value="16:9">16:9 ngang</option>
                <option value="9:16">9:16 dọc</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-gray-600 mb-1">Số giây</label>
              <select
                value={durationSeconds}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setDurationSeconds(next);
                  data.onOptionsChange?.({ aspectRatio, durationSeconds: next, voiceStyle, videoStyle });
                }}
                className="w-full rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] px-2 py-1.5 text-[10px] text-gray-300 outline-none"
                onPointerDown={e => e.stopPropagation()}
              >
                {[4, 6, 8, 10].map((seconds) => (
                  <option key={seconds} value={seconds}>{seconds}s</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[9px] text-gray-600 mb-1">Kiểu video</label>
              <select
                value={videoStyle}
                onChange={(e) => {
                  const next = e.target.value as 'tvc' | 'intro';
                  setVideoStyle(next);
                  data.onOptionsChange?.({ aspectRatio, durationSeconds, voiceStyle, videoStyle: next });
                }}
                className="w-full rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] px-2 py-1.5 text-[10px] text-gray-300 outline-none"
                onPointerDown={e => e.stopPropagation()}
              >
                <option value="tvc">TVC quảng cáo</option>
                <option value="intro">Giới thiệu tự nhiên</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[9px] text-gray-600 mb-1">Voice tiếng Việt</label>
              <select
                value={voiceStyle}
                onChange={(e) => {
                  const next = e.target.value;
                  setVoiceStyle(next);
                  data.onOptionsChange?.({ aspectRatio, durationSeconds, voiceStyle: next, videoStyle });
                }}
                className="w-full rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] px-2 py-1.5 text-[10px] text-gray-300 outline-none"
                onPointerDown={e => e.stopPropagation()}
              >
                <option value="No voiceover, music and natural ambient sound only">Không voice</option>
                <option value="Vietnamese female voice, warm Northern accent">Nữ miền Bắc</option>
                <option value="Vietnamese male voice, calm Northern accent">Nam miền Bắc</option>
                <option value="Vietnamese female voice, friendly Southern accent">Nữ miền Nam</option>
                <option value="Vietnamese male voice, confident Southern accent">Nam miền Nam</option>
                <option value="Vietnamese neutral studio voice, clear advertising narration">Giọng quảng cáo trung tính</option>
              </select>
            </div>
          </div>

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
              onClick={() => onGenerate?.({ prompt: '', aspectRatio, durationSeconds, voiceStyle, videoStyle })}
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
