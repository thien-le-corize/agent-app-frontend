'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Wand2, Loader2, Upload, X, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import NodeWrapper from './NodeWrapper';

interface AIPromptNodeProps {
  id: string;
  data: {
    onDelete?: () => void;
    generatedPrompt?: string;
    generating?: boolean;
    status?: 'idle' | 'running' | 'done' | 'error';
    brandName?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontStyle?: string;
    mood?: string;
    description?: string;
    refFileUrls?: string[];
    logoUrl?: string;
  };
}

function AIPromptNode({ id, data }: AIPromptNodeProps) {
  const { onDelete } = data;
  const { setNodes } = useReactFlow();

  const [brandName, setBrandName] = useState(data.brandName || '');
  const [primaryColor, setPrimaryColor] = useState(data.primaryColor || '');
  const [secondaryColor, setSecondaryColor] = useState(data.secondaryColor || '');
  const [fontStyle, setFontStyle] = useState(data.fontStyle || '');
  const [mood, setMood] = useState(data.mood || '');
  const [description, setDescription] = useState(data.description || '');
  const [generatedPrompt, setGeneratedPrompt] = useState(data.generatedPrompt || '');
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(data.logoUrl || '');
  const [collapsed, setCollapsed] = useState(false);

  const loading = data.generating || false;
  const status = data.status || 'idle';

  useEffect(() => {
    if (data.generatedPrompt) setGeneratedPrompt(data.generatedPrompt);
  }, [data.generatedPrompt]);

  const saveTimeout = useRef<any>(null);
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      setNodes((nds) => nds.map((n) => {
        if (n.id !== id) return n;
        return { ...n, data: { ...n.data, brandName, primaryColor, secondaryColor, fontStyle, mood, description } };
      }));
    }, 300);
  }, [brandName, primaryColor, secondaryColor, fontStyle, mood, description, id, setNodes]);

  useEffect(() => {
    setNodes((nds) => nds.map((n) => {
      if (n.id !== id) return n;
      return { ...n, data: { ...n.data, _refFiles: refFiles, _logoFile: logoFile } };
    }));
  }, [refFiles, logoFile, id, setNodes]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setLogoFile(f);
      const reader = new FileReader();
      reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    }
  };

  const onDrop = useCallback((accepted: File[]) => {
    setRefFiles((prev) => [...prev, ...accepted].slice(0, 4));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: true,
    maxFiles: 4,
  });

  return (
    <NodeWrapper onDelete={onDelete}>
      <div className="node-card nowheel" style={{ width: 300, background: '#141414', border: '1px solid #2a2a2a' }}>
        {/* Header */}
        <div
          className="node-header cursor-pointer select-none"
          style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '8px 12px' }}
          onClick={() => setCollapsed(v => !v)}
          onPointerDown={e => e.stopPropagation()}
        >
          <Wand2 className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-gray-200 font-semibold text-[11px]">AI Prompt Builder</span>
          <div className="flex items-center gap-1.5 ml-auto">
            {status === 'done' && <span className="text-[10px] text-emerald-400">✓</span>}
            {status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
            {collapsed
              ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              : <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
            }
          </div>
        </div>

        {!collapsed && (
          <div className="node-body space-y-2.5">
            {/* Brand + Logo */}
            <div>
              <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Brand</label>
              <div className="flex items-center gap-2">
                {logoPreview ? (
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid #333' }}>
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    <button onPointerDown={e => e.stopPropagation()} onClick={() => { setLogoFile(null); setLogoPreview(''); }} className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px]">✕</button>
                  </div>
                ) : (
                  <label className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition flex-shrink-0 hover:border-purple-400" style={{ border: '1px dashed #333' }} onPointerDown={e => e.stopPropagation()}>
                    <Upload className="w-3.5 h-3.5 text-gray-600" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                )}
                <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Tên thương hiệu" className="node-field !py-1.5 !text-[10px] flex-1" onPointerDown={e => e.stopPropagation()} />
              </div>
            </div>

            {/* Colors + Mood */}
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label className="text-[9px] text-gray-600 block mb-0.5">Màu chính</label>
                <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#FF5733" className="node-field !py-1.5 !text-[10px]" onPointerDown={e => e.stopPropagation()} />
              </div>
              <div>
                <label className="text-[9px] text-gray-600 block mb-0.5">Màu phụ</label>
                <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} placeholder="#333" className="node-field !py-1.5 !text-[10px]" onPointerDown={e => e.stopPropagation()} />
              </div>
              <div>
                <label className="text-[9px] text-gray-600 block mb-0.5">Mood</label>
                <select value={mood} onChange={e => setMood(e.target.value)} className="node-field !py-1.5 !text-[10px]" onPointerDown={e => e.stopPropagation()}>
                  <option value="">...</option>
                  <option value="Professional">Pro</option>
                  <option value="Luxury">Luxury</option>
                  <option value="Playful">Playful</option>
                  <option value="Minimal">Minimal</option>
                  <option value="Bold">Bold</option>
                  <option value="Elegant">Elegant</option>
                </select>
              </div>
            </div>

            {/* Font */}
            <div>
              <label className="text-[9px] text-gray-600 block mb-0.5">Font / Style</label>
              <input type="text" value={fontStyle} onChange={e => setFontStyle(e.target.value)} placeholder="Modern Sans, Serif..." className="node-field !py-1.5 !text-[10px]" onPointerDown={e => e.stopPropagation()} />
            </div>

            {/* Reference images */}
            <div>
              <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Hình tham khảo</label>
              {refFiles.length > 0 ? (
                <div className="grid grid-cols-4 gap-1">
                  {refFiles.map((f, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden aspect-square" style={{ border: '1px solid #2a2a2a' }}>
                      <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                      <button onPointerDown={e => e.stopPropagation()} onClick={() => setRefFiles(p => p.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <X className="w-2 h-2" />
                      </button>
                    </div>
                  ))}
                  {refFiles.length < 4 && (
                    <div {...getRootProps()} className="aspect-square rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-400 transition" style={{ border: '1px dashed #333' }}>
                      <input {...getInputProps()} />
                      <ImageIcon className="w-3 h-3 text-gray-600" />
                    </div>
                  )}
                </div>
              ) : (
                <div {...getRootProps()} className={`rounded-xl p-3 text-center cursor-pointer transition ${isDragActive ? 'border-purple-400 bg-purple-500/5' : 'hover:border-gray-500'}`} style={{ border: '1px dashed #2a2a2a' }}>
                  <input {...getInputProps()} />
                  <Upload className="w-4 h-4 mx-auto text-gray-600 mb-0.5" />
                  <p className="text-[9px] text-gray-600">Thả hình tham khảo (max 4)</p>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-0.5">Mô tả ý tưởng</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="VD: Banner khuyến mãi 50% niềng răng..."
                className="node-field !text-[10px] resize-none"
                rows={3}
                onPointerDown={e => e.stopPropagation()}
              />
            </div>

            {/* Status */}
            {!generatedPrompt && !loading && (
              <p className="text-[10px] text-gray-600 text-center py-2 rounded-xl" style={{ border: '1px dashed #2a2a2a' }}>
                Nhấn <span className="text-red-400 font-bold">Run ▶</span> để tạo prompt
              </p>
            )}

            {loading && (
              <div className="text-center py-4 rounded-xl" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin mx-auto" />
                <p className="text-[10px] text-purple-300 mt-1.5">Đang tạo prompt...</p>
              </div>
            )}

            {/* Generated prompt is kept internal to keep the workflow compact. */}
            {generatedPrompt && !loading && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-2">
                <p className="text-[10px] font-medium text-emerald-300">Đã tạo prompt</p>
                <p className="text-[9px] text-gray-500">Prompt đang được dùng ẩn khi nối sang Generate.</p>
              </div>
            )}
          </div>
        )}

        <Handle type="target" position={Position.Left} style={{ background: '#a855f7' }} />
        <Handle type="source" position={Position.Right} style={{ background: '#a855f7' }} />
      </div>
    </NodeWrapper>
  );
}

export default AIPromptNode;
