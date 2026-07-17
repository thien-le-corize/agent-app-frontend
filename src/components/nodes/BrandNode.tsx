'use client';

import { Handle, Position } from 'reactflow';
import { Palette, Plus, Check, Pencil, Trash2, Wand2 } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface BrandNodeProps {
  data: {
    brands?: any[];
    selectedBrand?: any;
    onSelect?: (brand: any) => void;
    onCreateNew?: () => void;
    onEdit?: (brand: any) => void;
    onAnalyzeBrand?: () => void | Promise<void>;
    analyzingBrand?: boolean;
    onDeleteBrand?: (brand: any) => void;
    onDelete?: () => void;
  };
}

function BrandNode({ data }: BrandNodeProps) {
  const { brands = [], selectedBrand, onSelect, onCreateNew, onEdit, onAnalyzeBrand, analyzingBrand, onDeleteBrand, onDelete } = data;

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
            <>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {brands.map((b: any) => (
                  <div key={b.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition cursor-pointer">
                    <button onClick={() => onSelect?.(b)} className="flex items-center gap-2 flex-1 text-left">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-md flex-shrink-0" style={{ backgroundColor: b.primary_color, border: '1px solid #333' }} />
                      )}
                      <span className="text-[11px] text-gray-300 truncate">{b.name}</span>
                    </button>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => onEdit?.(b)} className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-blue-400">
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => onDeleteBrand?.(b)} className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-red-400">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {brands.length === 0 && <p className="text-[10px] text-gray-600 text-center py-3">Chưa có brand nào</p>}
              </div>
              <button
                onClick={() => onCreateNew?.()}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] text-gray-400 hover:text-white transition"
                style={{ border: '1px dashed #2a2a2a', background: 'transparent' }}
              >
                <Plus className="w-3.5 h-3.5" /> Tạo brand mới
              </button>
            </>
          )}
        </div>

        <Handle type="source" position={Position.Right} style={{ background: '#a855f7' }} />
      </div>
    </NodeWrapper>
  );
}

export default BrandNode;
