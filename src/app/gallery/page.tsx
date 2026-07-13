'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Heart, Eye, Download, X, Loader2, ChevronDown, Sparkles } from 'lucide-react';

interface WorkItem {
  id: number;
  user_name: string;
  user_avatar: string;
  user_handle: string;
  output_image_url: string;
  likes_count: number;
  view_count: number;
  created_at: string;
  prompt_excerpt: string;
  model: string;
  size: string;
  quality: string;
  share_id: string;
}

interface ApiResponse {
  data: WorkItem[];
  nextOffset: number;
  hasMore: boolean;
}

export default function GalleryPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchImages = useCallback(async (currentOffset: number) => {
    if (loading) return;
    setLoading(true);
    
    try {
      const res = await fetch(
        `https://promptsref.com/api/home/showcase-works?limit=24&offset=${currentOffset}&sort=latest&model=gpt-image`
      );
      const data: ApiResponse = await res.json();
      
      if (currentOffset === 0) {
        setItems(data.data);
      } else {
        setItems(prev => [...prev, ...data.data]);
      }
      
      setHasMore(data.hasMore);
      setOffset(data.nextOffset);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Initial load
  useEffect(() => {
    fetchImages(0);
  }, []);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchImages(offset);
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [offset, hasMore, loading, fetchImages]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: 'rgba(18, 18, 20, 0.8)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>AI Gallery</h1>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>GPT Image Showcase</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                {items.length} images
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              onClick={() => setSelectedItem(item)}
            >
              {/* Image */}
              <div className="aspect-square overflow-hidden">
                <img
                  src={item.output_image_url}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
              </div>

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {/* Top info */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-black/50 text-white/90 backdrop-blur-sm">
                    {item.size}
                  </span>
                  <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-black/50 text-white/90 backdrop-blur-sm">
                    {item.quality}
                  </span>
                </div>

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  {/* User */}
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={item.user_avatar}
                      alt=""
                      className="w-6 h-6 rounded-full border border-white/20"
                    />
                    <span className="text-xs text-white/90 font-medium truncate">{item.user_name}</span>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-3 text-white/70">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{item.likes_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{item.view_count}</span>
                    </div>
                    <span className="text-[10px] ml-auto">{formatDate(item.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load more trigger */}
        <div ref={loaderRef} className="flex justify-center py-8">
          {loading && (
            <div className="flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          )}
          {!hasMore && items.length > 0 && (
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No more images</p>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.9)' }}
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="relative max-w-5xl w-full max-h-[90vh] flex gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="flex-1 flex items-center justify-center">
              <img
                src={selectedItem.output_image_url}
                alt=""
                className="max-w-full max-h-[85vh] object-contain rounded-xl"
              />
            </div>

            {/* Info Panel */}
            <div 
              className="w-[320px] shrink-0 rounded-xl p-5 overflow-y-auto max-h-[85vh]"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              {/* User */}
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={selectedItem.user_avatar}
                  alt=""
                  className="w-10 h-10 rounded-full"
                  style={{ border: '2px solid var(--border)' }}
                />
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedItem.user_name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{selectedItem.user_handle}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4 mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Heart className="w-4 h-4" />
                  <span className="text-sm font-medium">{selectedItem.likes_count}</span>
                </div>
                <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-medium">{selectedItem.view_count}</span>
                </div>
                <span className="text-xs ml-auto" style={{ color: 'var(--text-tertiary)' }}>
                  {formatDate(selectedItem.created_at)}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Model</span>
                  <span className="text-xs font-medium px-2 py-1 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                    {selectedItem.model.split('/')[1] || selectedItem.model}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Size</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{selectedItem.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Quality</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{selectedItem.quality}</span>
                </div>
              </div>

              {/* Prompt */}
              {selectedItem.prompt_excerpt && (
                <div className="mb-4">
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Prompt</p>
                  <div 
                    className="p-3 rounded-lg text-xs leading-relaxed max-h-[200px] overflow-y-auto"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                  >
                    {selectedItem.prompt_excerpt}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <a
                  href={selectedItem.output_image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <a
                  href={`https://promptsref.com/share/${selectedItem.share_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                >
                  View Original
                </a>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute -top-2 -right-2 p-2 rounded-full transition"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
