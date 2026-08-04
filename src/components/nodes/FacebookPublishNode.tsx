'use client';

import { Handle, Position } from 'reactflow';
import { CheckCircle2, ExternalLink, Facebook, Loader2, Send } from 'lucide-react';
import NodeWrapper from './NodeWrapper';
import type { ConnectedFacebookPage } from '@/lib/api';

interface Props {
  data: {
    pages?: ConnectedFacebookPage[];
    selectedPageId?: string;
    message?: string;
    imageUrl?: string;
    publishing?: boolean;
    published?: { post_id?: string; page_name?: string } | null;
    error?: string;
    onSelectPage?: (pageId: string) => void;
    onPublish?: () => void;
    onDelete?: () => void;
  };
}

export default function FacebookPublishNode({ data }: Props) {
  const pages = data.pages || [];
  const message = data.message || '';
  const selectedPage = pages.find((page) => page.page_id === data.selectedPageId);

  return (
    <NodeWrapper onDelete={data.onDelete}>
      <div className="node-card nowheel" style={{ width: 340, background: '#101216', border: '1px solid #1d4ed8' }}>
        <div className="node-header" style={{ background: '#111827', borderBottom: '1px solid #1d4ed8', padding: '8px 12px' }}>
          <Facebook className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-[11px] font-semibold text-blue-100">Đăng Fanpage</span>
          {data.published && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-400" />}
        </div>

        <div className="space-y-2 p-2">
          <select
            value={data.selectedPageId || ''}
            onChange={(event) => data.onSelectPage?.(event.target.value)}
            onPointerDown={(event) => event.stopPropagation()}
            className="w-full rounded-lg border border-blue-500/20 bg-black/30 px-2 py-2 text-[11px] text-blue-100 outline-none"
          >
            <option value="">Chọn fanpage</option>
            {pages.map((page) => (
              <option key={page.page_id} value={page.page_id}>
                {page.page_name}
              </option>
            ))}
          </select>

          {pages.length === 0 && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-2 text-[10px] leading-relaxed text-amber-200/80">
              Chưa có fanpage. Kết nối fanpage trong Chatbot Training trước.
            </p>
          )}

          {data.imageUrl && (
            <img src={data.imageUrl} alt="" className="max-h-32 w-full rounded-lg object-cover" />
          )}

          <textarea
            readOnly
            value={message}
            onPointerDown={(event) => event.stopPropagation()}
            className="h-36 w-full resize-none rounded-lg border border-white/10 bg-black/25 px-2 py-2 text-[10px] leading-relaxed text-gray-200 outline-none"
            placeholder="Nối Content Writer hoặc Text node vào đây..."
          />

          <button
            type="button"
            disabled={!selectedPage || !message.trim() || data.publishing}
            onClick={data.onPublish}
            onPointerDown={(event) => event.stopPropagation()}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: '#2563eb' }}
          >
            {data.publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {data.publishing ? 'Đang đăng...' : 'Đăng bài'}
          </button>

          {data.published && (
            <p className="flex items-center gap-1.5 text-[10px] text-emerald-300">
              <ExternalLink className="h-3 w-3" />
              Đã đăng lên {data.published.page_name || selectedPage?.page_name || 'fanpage'}
            </p>
          )}
          {data.error && <p className="text-[10px] text-red-400">{data.error}</p>}
        </div>

        <Handle type="target" position={Position.Left} style={{ background: '#2563eb' }} />
      </div>
    </NodeWrapper>
  );
}
