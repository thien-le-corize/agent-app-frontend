'use client';

import { Handle, Position } from 'reactflow';
import { Palette, Check, Pencil, Wand2 } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface BrandNodeProps {
  data: {
    brands?: any[];
    selectedBrand?: any;
    onSelect?: (brand: any) => void;
    onEdit?: (brand: any) => void;
    onAnalyzeBrand?: () => void | Promise<void>;
    analyzingBrand?: boolean;
    onDelete?: () => void;
  };
}

function BrandNode({ data }: BrandNodeProps) {
  const { selectedBrand, onSelect, onEdit, onAnalyzeBrand, analyzingBrand, onDelete } = data;

  return (
    <NodeWrapper onDelete={onDelete}>
      <div className="node-card" style={{ width: 220, background: '#141414', border: '1px solid #2a2a2a' }}>
        {/* Header */}
        <div className="node-header" style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '8px 12px' }}>
          <Palette className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-gray-200 font-semibold text-[11px]">Brand</span>
          {selectedBrand && <Check className="w-3 h-3 text-emerald-400 ml-auto" />}
        </div>

        <div className="p-2 space-y-1.5">
          {selectedBrand ? (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2a2a' }}>
              {/* Logo nếu có */}
              {selectedBrand.logo_url && (
                <div className="w-full flex items-center justify-center py-3" style={{ background: '#1a1a1a' }}>
                  <img src={selectedBrand.logo_url} alt="" className="h-10 max-w-full object-contain" />
                </div>
              )}
              <div className="px-2.5 py-2">
                <p className="text-[11px] font-semibold text-white truncate">{selectedBrand.name}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="w-4 h-4 rounded-md" style={{ backgroundColor: selectedBrand.primary_color }} title="Primary" />
                  {selectedBrand.secondary_color && (
                    <div className="w-4 h-4 rounded-md" style={{ backgroundColor: selectedBrand.secondary_color }} title="Secondary" />
                  )}
                  <div className="flex gap-1 ml-auto">
                    <button onClick={() => onEdit?.(selectedBrand)} className="p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-blue-400 transition" title="Sửa">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => onSelect?.(null)} className="p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-200 transition" title="Bỏ chọn">
                      <span className="text-[10px]">✕</span>
                    </button>
                  </div>
                </div>
                {selectedBrand.logo_url && (
                  <button
                    type="button"
                    onClick={() => onAnalyzeBrand?.()}
                    onPointerDown={e => e.stopPropagation()}
                    disabled={analyzingBrand}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-medium text-violet-300 transition hover:bg-violet-500/15 disabled:opacity-60"
                    style={{ border: '1px solid rgba(168,85,247,0.25)', background: 'rgba(168,85,247,0.08)' }}
                    title="Quét tên thương hiệu, màu sắc và font từ logo"
                  >
                    {analyzingBrand ? (
                      <div className="h-3 w-3 rounded-full border-2 border-violet-300 border-t-transparent animate-spin" />
                    ) : (
                      <Wand2 className="h-3 w-3" />
                    )}
                    {analyzingBrand ? 'Đang quét...' : 'Quét logo'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl px-3 py-4 text-center"
              style={{ border: '1px dashed #2a2a2a', background: '#111111' }}
            >
              <Palette className="mx-auto mb-2 h-4 w-4 text-violet-400/70" />
              <p className="text-[11px] font-medium text-gray-400">Chưa gắn brand</p>
              <p className="mt-1 text-[9px] leading-relaxed text-gray-600">
                Tạo brand mới để tự động active cho dự án này
              </p>
            </div>
          )}
        </div>

        <Handle type="source" position={Position.Right} style={{ background: '#a855f7' }} />
      </div>
    </NodeWrapper>
  );
}

export default BrandNode;
