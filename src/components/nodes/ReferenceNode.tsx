'use client';

import { useCallback, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { ImageIcon, X, Upload, Plus, BookImage } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import NodeWrapper from './NodeWrapper';
import ReferenceLibraryModal from '../ReferenceLibraryModal';
import { uploadReferenceImage } from '@/lib/api';

interface ReferenceNodeProps {
  data: {
    files?: File[];
    // URL ảnh đã chọn từ thư viện (để dùng trực tiếp không cần re-upload)
    libraryUrls?: string[];
    onFilesAdd?: (files: File[]) => void;
    onFileRemove?: (index: number) => void;
    onLibraryUrlsChange?: (urls: string[]) => void;
    onDelete?: () => void;
  };
}

function ReferenceNode({ data }: ReferenceNodeProps) {
  const { files = [], libraryUrls = [], onFilesAdd, onFileRemove, onLibraryUrlsChange, onDelete } = data;
  const [showLibrary, setShowLibrary] = useState(false);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (accepted: File[]) => {
    // Upload lên server và lưu vào thư viện luôn
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of accepted) {
        const res = await uploadReferenceImage(file, file.name);
        uploadedUrls.push(res.url);
      }
      // Thêm vào libraryUrls của node
      onLibraryUrlsChange?.([...libraryUrls, ...uploadedUrls].filter((url, index, urls) => urls.indexOf(url) === index));
    } catch {
      // fallback: chỉ add file local
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

  const allUrls = [
    ...libraryUrls,
    ...files.map(f => URL.createObjectURL(f)),
  ];

  const removeLibraryUrl = (url: string) => {
    onLibraryUrlsChange?.(libraryUrls.filter(u => u !== url));
  };

  const totalCount = allUrls.length;

  return (
    <NodeWrapper onDelete={onDelete}>
      <div className="node-card nowheel" style={{ width: 240, background: '#141414', border: '1px solid #2a2a2a' }}>
        {/* Header */}
        <div className="node-header" style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '8px 10px' }}>
          <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-gray-200 font-semibold text-[11px]">Hình tham khảo</span>
          <div className="flex items-center gap-1.5 ml-auto">
            {totalCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md text-amber-400" style={{ background: 'rgba(245,158,11,0.1)' }}>
                {totalCount}
              </span>
            )}
            {/* Nút mở thư viện */}
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => setShowLibrary(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-gray-400 hover:text-amber-400 transition"
              style={{ border: '1px solid #2a2a2a' }}
              title="Chọn từ thư viện"
            >
              <BookImage className="w-3 h-3" />
              Thư viện
            </button>
          </div>
        </div>

        {/* Images grid */}
        {allUrls.length > 0 ? (
          <div className="p-1.5">
            <div className={`grid gap-1 ${allUrls.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {/* Library URLs */}
              {libraryUrls.map((url, i) => (
                <div key={`lib-${i}`} className="relative group rounded-lg overflow-hidden aspect-square" style={{ border: '1px solid #f59e0b33' }}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {/* badge thư viện */}
                  <div className="absolute top-1 left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.8)' }}>
                    <BookImage className="w-2 h-2 text-white" />
                  </div>
                  <button
                    onClick={() => removeLibraryUrl(url)}
                    onPointerDown={e => e.stopPropagation()}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {/* Local files */}
              {files.map((f, i) => (
                <div key={`file-${i}`} className="relative group rounded-lg overflow-hidden aspect-square" style={{ border: '1px solid #2a2a2a' }}>
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => onFileRemove?.(i)}
                    onPointerDown={e => e.stopPropagation()}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {/* Add more */}
              <div
                {...getRootProps()}
                className="aspect-square rounded-lg flex items-center justify-center cursor-pointer hover:border-amber-400 transition"
                style={{ border: '1px dashed #333' }}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <div className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 text-gray-600" />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-1.5 space-y-1.5">
            {/* Drop zone */}
            <div
              {...getRootProps()}
              className={`rounded-xl p-4 text-center cursor-pointer transition-all ${isDragActive ? 'border-amber-400 bg-amber-500/5' : 'hover:border-gray-500'}`}
              style={{ border: '1px dashed #2a2a2a' }}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <>
                  <div className="w-5 h-5 mx-auto mb-1.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                  <p className="text-[10px] text-amber-400">Đang upload...</p>
                </>
              ) : (
                <>
                  <Upload className={`w-5 h-5 mx-auto mb-1.5 ${isDragActive ? 'text-amber-400' : 'text-gray-600'}`} />
                  <p className="text-[10px] text-gray-500">Upload & lưu vào thư viện</p>
                </>
              )}
            </div>

            {/* Hoặc chọn từ thư viện */}
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => setShowLibrary(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] text-gray-400 hover:text-amber-400 transition"
              style={{ border: '1px dashed #2a2a2a' }}
            >
              <BookImage className="w-3.5 h-3.5" />
              Chọn từ thư viện
            </button>
          </div>
        )}

        <Handle type="target" position={Position.Left} style={{ background: '#f59e0b' }} />
        <Handle type="source" position={Position.Right} style={{ background: '#f59e0b' }} />
      </div>

      {/* Library Modal */}
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

export default ReferenceNode;
