'use client';

import { useCallback, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { ImagePlus, X, Upload, Plus, BookImage, Layers } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import NodeWrapper from './NodeWrapper';
import ReferenceLibraryModal from '../ReferenceLibraryModal';
import { uploadReferenceImage } from '@/lib/api';

// Các loại input image
const INPUT_TYPES = [
  { value: 'subject',  label: 'Chủ thể',    color: '#3b82f6', desc: 'Người, sản phẩm, vật thể cần xuất hiện trong ảnh' },
  { value: 'face',     label: 'Khuôn mặt',  color: '#a855f7', desc: 'Ảnh khuôn mặt để giữ nhận dạng' },
  { value: 'product',  label: 'Sản phẩm',   color: '#f97316', desc: 'Ảnh sản phẩm cần ghép vào poster' },
  { value: 'element',  label: 'Thành phần', color: '#22c55e', desc: 'Ảnh element phụ (nền, vật trang trí...)' },
];

interface InputImageNodeProps {
  data: {
    files?: File[];
    libraryUrls?: string[];
    inputType?: string;
    label?: string;
    onFilesAdd?: (files: File[]) => void;
    onFileRemove?: (index: number) => void;
    onLibraryUrlsChange?: (urls: string[]) => void;
    onInputTypeChange?: (type: string) => void;
    onDelete?: () => void;
  };
}

function InputImageNode({ data }: InputImageNodeProps) {
  const {
    files = [],
    libraryUrls = [],
    inputType = 'subject',
    label,
    onFilesAdd,
    onFileRemove,
    onLibraryUrlsChange,
    onInputTypeChange,
    onDelete,
  } = data;

  const [showLibrary, setShowLibrary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const currentType = INPUT_TYPES.find(t => t.value === inputType) || INPUT_TYPES[0];

  const onDrop = useCallback(async (accepted: File[]) => {
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of accepted) {
        const res = await uploadReferenceImage(file, file.name);
        uploadedUrls.push(res.url);
      }
      onLibraryUrlsChange?.([...libraryUrls, ...uploadedUrls]);
      onFilesAdd?.(accepted);
    } catch {
      onFilesAdd?.(accepted);
    } finally {
      setUploading(false);
    }
  }, [libraryUrls, onFilesAdd, onLibraryUrlsChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: true,
  });

  const removeLibraryUrl = (url: string) => {
    onLibraryUrlsChange?.(libraryUrls.filter(u => u !== url));
  };

  const totalCount = libraryUrls.length + files.length;

  return (
    <NodeWrapper onDelete={onDelete}>
      <div
        className="node-card nowheel"
        style={{
          width: 240,
          background: '#141414',
          border: `1px solid ${currentType.color}33`,
        }}
      >
        {/* Header */}
        <div
          className="node-header"
          style={{
            background: '#1a1a1a',
            borderBottom: `1px solid ${currentType.color}22`,
            padding: '8px 10px',
          }}
        >
          <ImagePlus className="w-3.5 h-3.5" style={{ color: currentType.color }} />
          <span className="text-gray-200 font-semibold text-[11px]">{label || 'Input Image'}</span>
          <div className="flex items-center gap-1.5 ml-auto">
            {totalCount > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: `${currentType.color}18`, color: currentType.color }}
              >
                {totalCount}
              </span>
            )}
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => setShowLibrary(true)}
              className="p-1 rounded-lg transition hover:bg-white/10"
              title="Chọn từ thư viện"
            >
              <BookImage className="w-3 h-3 text-gray-500 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Type selector */}
        <div className="px-2.5 pt-2 pb-1 relative">
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={() => setShowTypeMenu(v => !v)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition hover:bg-white/5"
            style={{
              background: `${currentType.color}10`,
              border: `1px solid ${currentType.color}30`,
              color: currentType.color,
            }}
          >
            <Layers className="w-3 h-3" />
            <span className="flex-1 text-left">{currentType.label}</span>
            <span className="text-[9px] text-gray-600">▾</span>
          </button>

          {showTypeMenu && (
            <div
              className="absolute left-2.5 right-2.5 top-full mt-1 rounded-xl overflow-hidden shadow-xl z-10"
              style={{ background: '#1e1e1e', border: '1px solid #333' }}
            >
              {INPUT_TYPES.map(t => (
                <button
                  key={t.value}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => { onInputTypeChange?.(t.value); setShowTypeMenu(false); }}
                  className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-white/5 transition text-left"
                >
                  <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: t.color }} />
                  <div>
                    <p className="text-[11px] font-medium text-white">{t.label}</p>
                    <p className="text-[9px] text-gray-500">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Images */}
        {totalCount > 0 ? (
          <div className="p-1.5">
            <div className={`grid gap-1 ${totalCount <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {libraryUrls.map((url, i) => (
                <div
                  key={`lib-${i}`}
                  className="relative group rounded-lg overflow-hidden aspect-square"
                  style={{ border: `1px solid ${currentType.color}33` }}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <div
                    className="absolute top-1 left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                    style={{ background: currentType.color }}
                  >
                    <BookImage className="w-2 h-2 text-white" />
                  </div>
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => removeLibraryUrl(url)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {files.map((f, i) => (
                <div
                  key={`file-${i}`}
                  className="relative group rounded-lg overflow-hidden aspect-square"
                  style={{ border: '1px solid #2a2a2a' }}
                >
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => onFileRemove?.(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div
                {...getRootProps()}
                className="aspect-square rounded-lg flex items-center justify-center cursor-pointer transition"
                style={{ border: '1px dashed #333' }}
              >
                <input {...getInputProps()} />
                {uploading
                  ? <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${currentType.color} transparent` }} />
                  : <Plus className="w-4 h-4 text-gray-600" />
                }
              </div>
            </div>
          </div>
        ) : (
          <div className="p-1.5 space-y-1.5">
            <div
              {...getRootProps()}
              className={`rounded-xl p-4 text-center cursor-pointer transition-all`}
              style={{
                border: isDragActive ? `1px solid ${currentType.color}` : '1px dashed #2a2a2a',
                background: isDragActive ? `${currentType.color}08` : 'transparent',
              }}
            >
              <input {...getInputProps()} />
              <Upload className="w-5 h-5 mx-auto mb-1.5" style={{ color: isDragActive ? currentType.color : '#4b5563' }} />
              <p className="text-[10px] text-gray-500">Upload & lưu vào thư viện</p>
              <p className="text-[9px] text-gray-600 mt-0.5">{currentType.desc}</p>
            </div>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => setShowLibrary(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] text-gray-400 hover:text-white transition"
              style={{ border: '1px dashed #2a2a2a' }}
            >
              <BookImage className="w-3.5 h-3.5" />
              Chọn từ thư viện
            </button>
          </div>
        )}

        {/* Hint */}
        <div className="px-2.5 pb-2">
          <p className="text-[9px] text-gray-600 text-center">
            Ảnh này sẽ được <span style={{ color: currentType.color }}>ghép trực tiếp</span> vào output
          </p>
        </div>

        <Handle type="target" position={Position.Left} style={{ background: currentType.color }} />
        <Handle type="source" position={Position.Right} style={{ background: currentType.color }} />
      </div>

      {showLibrary && (
        <ReferenceLibraryModal
          selectedUrls={libraryUrls}
          onSelect={(urls) => onLibraryUrlsChange?.(urls)}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </NodeWrapper>
  );
}

export default InputImageNode;
