'use client';

import { Handle, Position } from 'reactflow';
import { Palette, Plus, Check, Pencil, Trash2 } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface BrandNodeProps {
  data: {
    brands?: any[];
    selectedBrand?: any;
    onSelect?: (brand: any) => void;
    onCreateNew?: () => void;
    onEdit?: (brand: any) => void;
    onDeleteBrand?: (brand: any) => void;
    onDelete?: () => void;
  };
}

function BrandNode({ data }: BrandNodeProps) {
  const { brands = [], selectedBrand, onSelect, onCreateNew, onEdit, onDeleteBrand, onDelete } = data;

  return (
    <NodeWrapper onDelete={onDelete}>
      <div className="node-card">
        <div className="node-header">
          <Palette className="w-4 h-4 text-violet-400" />
          <span className="text-gray-200 font-semibold">Brand</span>
          <div className="node-status-dot ml-auto" />
          {selectedBrand && <Check className="w-3 h-3 text-emerald-400" />}
        </div>
        <div className="node-body">
          {selectedBrand ? (
            <div className="p-2 rounded-lg bg-white/5 border border-[var(--node-border)]">
              <div className="flex items-center gap-2">
                {selectedBrand.logo_url ? (
                  <img src={selectedBrand.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: selectedBrand.primary_color }} />
                )}
                <span className="text-xs font-medium text-gray-200 truncate flex-1">{selectedBrand.name}</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <div className="flex gap-1 flex-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: selectedBrand.primary_color }} title="Primary" />
                  {selectedBrand.secondary_color && (
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: selectedBrand.secondary_color }} title="Secondary" />
                  )}
                </div>
                <button 
                  onClick={() => onEdit?.(selectedBrand)} 
                  className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-blue-400 transition"
                  title="Sửa brand"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => onSelect?.(null)} 
                  className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition"
                  title="Bỏ chọn"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="max-h-28 overflow-y-auto space-y-1">
                {brands.map((b: any) => (
                  <div
                    key={b.id}
                    className="group flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <button
                      onClick={() => onSelect?.(b)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {b.logo_url ? (
                        <img src={b.logo_url} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded flex-shrink-0 border border-[var(--node-border)]" style={{ backgroundColor: b.primary_color }} />
                      )}
                      <span className="text-xs text-gray-300 truncate">{b.name}</span>
                    </button>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      <button 
                        onClick={() => onEdit?.(b)} 
                        className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-blue-400"
                        title="Sửa"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                      <button 
                        onClick={() => onDeleteBrand?.(b)} 
                        className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-red-400"
                        title="Xóa"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {brands.length === 0 && <p className="text-[10px] text-gray-500 text-center py-2">Chưa có brand</p>}
              <button onClick={() => onCreateNew?.()} className="node-btn-secondary flex items-center justify-center gap-1 mt-1">
                <Plus className="w-3 h-3" /> Tạo mới
              </button>
            </>
          )}
        </div>
        <Handle type="source" position={Position.Right} />
      </div>
    </NodeWrapper>
  );
}

export default BrandNode;
