'use client';

import { useCallback, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Image as ImageIcon, X, Upload, Plus, BookImage } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import NodeWrapper from './NodeWrapper';
import ReferenceLibraryModal from '../ReferenceLibraryModal';
import { uploadReferenceImage } from '@/lib/api';

interface ImageNodeProps {
  data: {
    files?: File[];
    libraryUrls?: string[];
    onFilesAdd?: (files: File[]) => void;
    onFileRemove?: (index: number) => void;
    onLibraryUrlsChange?: (urls: string[]) => void;
    onDelete?: () => void;
    label?: string;
  };
}

function ImageNode({ data }: ImageNodeProps) {
  const { files = [], libraryUrls = [], onFilesAdd, onFileRemove, onLibraryUrlsChange, onDelete, label } = data;
  const [showLibrary, setShowLibrary] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      <div className="node-card nowheel" style={{ width: 240, background: '#141414', border: '1px solid #2a2a2a' }}>
        {/* Header */}
        <div className="node-header" style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '8px 10px' }}>
          <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-gray-200 font-semibold text-[11px]">{label || 'Ảnh đầu vào'}</span>
          <div className="flex items-center gap-1.5 ml-auto">
            {totalCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md text-cyan-400" style={{ background: 'rgba(6,182,212,0.1)' }}>
                {totalCount}
              </span>
            )}
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => setShowLibrary(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-gray-400 hover:text-cyan-400 transition"
              style={{ border: '1px solid #2a2a2a' }}
              title="Chọn từ thư viện"
            >
              <BookImage className="w-3 h-3" />
              Thư viện
            </button>
          </div>
        </div>

        {/* Images grid */}
        {totalCount > 0 ? (
          <div className="p-1.5">
            <div className={`grid gap-1 ${totalCount <= 2 ? 'grid-cols-2' : totalCount === 3 ? 'grid-cols-3' : 'grid-cols-3'}`}>
              {libraryUrls.map((url, i) => (
                <div key={`lib-${i}`} className="relative group rounded-lg overflow-hidden" style={{ aspectRatio: libraryUrls.length + files.length === 1 ? '4/3' : '1/1', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.8)' }}>
                    <BookImage className="w-2 h-2 text-white" />
                  </div>
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => removeLibraryUrl(url)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {files.map((f, i) => (
                <div key={`file-${i}`} className="relative group rounded-lg overflow-hidden aspect-square" style={{ border: '1px solid #2a2a2a' }}>
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => onFileRemove?.(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div
                {...getRootProps()}
                className="aspect-square rounded-lg flex items-center justify-center cursor-pointer hover:border-cyan-400 transition"
                style={{ border: '1px dashed #333' }}
              >
                <input {...getInputProps()} />
                {uploading
                  ? <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  : <Plus className="w-4 h-4 text-gray-600" />
                }
              </div>
            </div>
          </div>
        ) : (
          <div className="p-1.5 space-y-1.5">
            <div
              {...getRootProps()}
              className={`rounded-xl p-4 text-center cursor-pointer transition-all ${isDragActive ? 'border-cyan-400 bg-cyan-500/5' : 'hover:border-gray-500'}`}
              style={{ border: '1px dashed #2a2a2a' }}
            >
              <input {...getInputProps()} />
              <Upload className={`w-5 h-5 mx-auto mb-1.5 ${isDragActive ? 'text-cyan-400' : 'text-gray-600'}`} />
              <p className="text-[10px] text-gray-500">Upload & lưu vào thư viện</p>
              <p className="text-[9px] text-gray-600 mt-0.5">PNG, JPG, WEBP</p>
            </div>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => setShowLibrary(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] text-gray-400 hover:text-cyan-400 transition"
              style={{ border: '1px dashed #2a2a2a' }}
            >
              <BookImage className="w-3.5 h-3.5" />
              Chọn từ thư viện
            </button>
          </div>
        )}

        <Handle type="target" position={Position.Left} style={{ background: '#06b6d4' }} />
        <Handle type="source" position={Position.Right} style={{ background: '#06b6d4' }} />
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

export default ImageNode;
