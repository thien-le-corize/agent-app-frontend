'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Check, Loader2, Upload, Search } from 'lucide-react';
import { getImageGenerations, getReferenceImages, uploadReferenceImage, deleteReferenceImage } from '@/lib/api';
import { useDropzone } from 'react-dropzone';

interface RefImage {
  id: string;
  url: string;
  original_name: string | null;
  label: string | null;
  tags: string[] | null;
  created_at: string;
  source?: 'reference' | 'generated';
}

interface Props {
  onClose: () => void;
  // Các URL đang được chọn trong node (để highlight)
  selectedUrls?: string[];
  // Khi user chọn/bỏ chọn ảnh
  onSelect: (urls: string[]) => void;
}

export default function ReferenceLibraryModal({ onClose, selectedUrls = [], onSelect }: Props) {
  const [images, setImages] = useState<RefImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedUrls));
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [referenceImages, generatedImages] = await Promise.all([
        getReferenceImages(),
        getImageGenerations().catch(() => []),
      ]);
      const refs = referenceImages.map((image) => ({ ...image, source: 'reference' as const }));
      const generated = generatedImages
        .filter((item) => item.status === 'completed' && item.result_url)
        .map((item) => ({
          id: `generated-${item.id}`,
          url: item.result_url!,
          original_name: 'Ảnh tạo từ workflow',
          label: item.project?.name ? `Workflow - ${item.project.name}` : 'Ảnh tạo từ workflow',
          tags: ['generated', 'workflow'],
          created_at: item.created_at,
          source: 'generated' as const,
        }));
      const seen = new Set<string>();
      setImages([...generated, ...refs].filter((image) => {
        if (seen.has(image.url)) return false;
        seen.add(image.url);
        return true;
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const onDrop = useCallback(async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        const res = await uploadReferenceImage(file, file.name);
        setImages(prev => [{ ...res, original_name: file.name, tags: null, created_at: new Date().toISOString(), source: 'reference' } as RefImage, ...prev]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: true,
    noClick: false,
  });

  const toggleSelect = (url: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleDelete = async (img: RefImage) => {
    if (img.source === 'generated') return;
    setDeletingId(img.id);
    try {
      await deleteReferenceImage(img.id);
      setImages(prev => prev.filter(i => i.id !== img.id));
      setSelected(prev => { const n = new Set(prev); n.delete(img.url); return n; });
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleConfirm = () => {
    onSelect(Array.from(selected));
    onClose();
  };

  const filtered = images.filter(img =>
    !search || (img.label || img.original_name || '').toLowerCase().includes(search.toLowerCase())
  );

  // Portal để render ra ngoài ReactFlow DOM (tránh bị clip/hidden)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', zIndex: 99999 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#141414', border: '1px solid #2a2a2a' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2a2a2a' }}>
          <div>
            <h2 className="text-white font-semibold text-sm">Thư viện hình tham khảo</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">{images.length} ảnh, gồm ảnh upload và ảnh đã tạo</p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
              >
                <Check className="w-4 h-4" />
                Dùng {selected.size} ảnh
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Search + Upload */}
        <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid #1e1e1e' }}>
          <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl" style={{ background: '#1e1e1e', border: '1px solid #2a2a2a' }}>
            <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm ảnh..."
              className="flex-1 bg-transparent text-[12px] text-gray-300 outline-none"
            />
          </div>

          {/* Upload drop zone nhỏ */}
          <div
            {...getRootProps()}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition text-[12px] font-medium ${
              isDragActive ? 'text-orange-400 border-orange-400' : 'text-gray-400 hover:text-white hover:border-gray-500'
            }`}
            style={{ border: '1px dashed #333' }}
          >
            <input {...getInputProps()} />
            {uploading
              ? <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
              : <Upload className="w-4 h-4" />
            }
            {isDragActive ? 'Thả vào đây' : 'Upload ảnh mới'}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center py-16 rounded-2xl cursor-pointer transition ${isDragActive ? 'border-orange-400 bg-orange-500/5' : 'hover:border-gray-500'}`}
              style={{ border: '2px dashed #2a2a2a' }}
            >
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 text-gray-600 mb-3" />
              <p className="text-sm text-gray-500">
                {search ? 'Không tìm thấy ảnh' : 'Chưa có ảnh nào — upload ảnh đầu tiên'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {filtered.map(img => {
                const isSelected = selected.has(img.url);
                return (
                  <div
                    key={img.id}
                    className="relative group rounded-xl overflow-hidden cursor-pointer transition-all"
                    style={{
                      border: isSelected ? '2px solid #f97316' : '2px solid #2a2a2a',
                      boxShadow: isSelected ? '0 0 0 2px rgba(249,115,22,0.3)' : 'none',
                    }}
                    onClick={() => toggleSelect(img.url)}
                  >
                    <img
                      src={img.url}
                      alt={img.label || ''}
                      className="w-full aspect-square object-cover"
                    />

                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#f97316' }}>
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all" />

                    {/* Delete button */}
                    {img.source !== 'generated' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(img); }}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                      >
                        {deletingId === img.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />
                        }
                      </button>
                    )}
                    {img.source === 'generated' && (
                      <div className="absolute top-2 right-2 rounded-full bg-blue-500/90 px-2 py-0.5 text-[9px] font-medium text-white shadow">
                        AI
                      </div>
                    )}

                    {/* Label dưới */}
                    <div
                      className="absolute bottom-0 left-0 right-0 px-2 py-1.5 opacity-0 group-hover:opacity-100 transition"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
                    >
                      <p className="text-[10px] text-white/80 truncate">{img.label || img.original_name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {selected.size > 0 && (
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid #2a2a2a' }}>
            <p className="text-[12px] text-gray-500">Đã chọn <span className="text-white font-medium">{selected.size}</span> ảnh</p>
            <div className="flex gap-2">
              <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 rounded-lg text-[12px] text-gray-400 hover:text-white transition" style={{ border: '1px solid #333' }}>
                Bỏ chọn tất cả
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
              >
                <Check className="w-3.5 h-3.5" />
                Xác nhận
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
