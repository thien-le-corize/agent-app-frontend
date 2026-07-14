'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Eye, Download, X, Loader2, Sparkles, Plus, Search, Filter } from 'lucide-react';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function HomePage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [fullPromptText, setFullPromptText] = useState('');
  const loaderRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const router = useRouter();

  // Fetch full prompt khi mở lightbox
  useEffect(() => {
    if (selectedItem?.share_id) {
      setFullPromptText(selectedItem.prompt_excerpt || '');
      // Fetch full prompt
      fetch(`${API_URL}/gallery/prompt?share_id=${selectedItem.share_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.prompt) {
            setFullPromptText(data.prompt);
          }
        })
        .catch(err => console.error('Lỗi khi lấy prompt:', err));
    }
  }, [selectedItem]);

  // Chuyển sang Image Tool với reference
  const handleUseAsReference = () => {
    if (!selectedItem) return;
    setLoadingPrompt(true);
    
    const params = new URLSearchParams({
      ref: selectedItem.output_image_url,
      prompt: fullPromptText || selectedItem.prompt_excerpt || '',
    });
    
    setSelectedItem(null);
    setLoadingPrompt(false);
    router.push(`/image-tool?${params.toString()}`);
  };

  // Fetch images
  const fetchImages = async (currentOffset: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    
    try {
      const res = await fetch(
        `${API_URL}/gallery?limit=24&offset=${currentOffset}&sort=latest&model=gpt-image`
      );
      const data: ApiResponse = await res.json();
      
      if (currentOffset === 0) {
        setItems(data.data || []);
      } else {
        setItems(prev => [...prev, ...(data.data || [])]);
      }
      
      setHasMore(data.hasMore);
      setOffset(data.nextOffset);
    } catch (error) {
      console.error('Lỗi khi tải ảnh:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Tải lần đầu
  useEffect(() => {
    fetchImages(0);
  }, []);

  // Infinite scroll
  useEffect(() => {
    const currentLoader = loaderRef.current;
    if (!currentLoader) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          fetchImages(offset);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentLoader);

    return () => observer.disconnect();
  }, [offset, hasMore]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: 'rgba(10, 10, 10, 0.9)', borderBottom: '1px solid #222' }}>
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Thư viện AI</h1>
                <p className="text-xs text-gray-500">Khám phá ảnh GPT Image</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-lg text-sm text-gray-400" style={{ background: '#151515' }}>
                {items?.length || 0} ảnh
              </div>
              <button
                onClick={() => router.push('/image-tool')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
              >
                <Plus className="w-4 h-4" />
                Tạo ảnh mới
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {(items || []).map((item) => (
            <div
              key={item.id}
              className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
              style={{ background: '#151515', border: '1px solid #222' }}
              onClick={() => setSelectedItem(item)}
            >
              {/* Ảnh */}
              <div className="aspect-square overflow-hidden">
                <img
                  src={item.output_image_url}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
              </div>

              {/* Overlay khi hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {/* Thông tin trên */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-black/50 text-white/90 backdrop-blur-sm">
                    {item.size}
                  </span>
                  <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-black/50 text-white/90 backdrop-blur-sm">
                    {item.quality}
                  </span>
                </div>

                {/* Thông tin dưới */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  {/* Người dùng */}
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={item.user_avatar}
                      alt=""
                      className="w-6 h-6 rounded-full border border-white/20"
                    />
                    <span className="text-xs text-white/90 font-medium truncate">{item.user_name}</span>
                  </div>
                  
                  {/* Thống kê */}
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
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Đang tải thêm...</span>
            </div>
          )}
          {!hasMore && (items?.length || 0) > 0 && (
            <p className="text-sm text-gray-600">Đã hiển thị tất cả ảnh</p>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.95)' }}
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="relative max-w-5xl w-full max-h-[90vh] flex gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ảnh */}
            <div className="flex-1 flex items-center justify-center">
              <img
                src={selectedItem.output_image_url}
                alt=""
                className="max-w-full max-h-[85vh] object-contain rounded-xl"
              />
            </div>

            {/* Bảng thông tin */}
            <div 
              className="w-[320px] shrink-0 rounded-xl p-5 overflow-y-auto max-h-[85vh]"
              style={{ background: '#151515', border: '1px solid #222' }}
            >
              {/* Người dùng */}
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={selectedItem.user_avatar}
                  alt=""
                  className="w-10 h-10 rounded-full"
                  style={{ border: '2px solid #333' }}
                />
                <div>
                  <p className="font-medium text-white">{selectedItem.user_name}</p>
                  <p className="text-xs text-gray-500">@{selectedItem.user_handle}</p>
                </div>
              </div>

              {/* Thống kê */}
              <div className="flex gap-4 mb-4 pb-4" style={{ borderBottom: '1px solid #222' }}>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm font-medium">{selectedItem.likes_count}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-medium">{selectedItem.view_count}</span>
                </div>
                <span className="text-xs ml-auto text-gray-500">
                  {formatDate(selectedItem.created_at)}
                </span>
              </div>

              {/* Chi tiết */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Model</span>
                  <span className="text-xs font-medium px-2 py-1 rounded text-white" style={{ background: '#1a1a1a' }}>
                    {selectedItem.model.split('/')[1] || selectedItem.model}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Kích thước</span>
                  <span className="text-xs font-medium text-white">{selectedItem.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Chất lượng</span>
                  <span className="text-xs font-medium text-white">{selectedItem.quality}</span>
                </div>
              </div>

              {/* Prompt */}
              {(fullPromptText || selectedItem.prompt_excerpt) && (
                <div className="mb-4">
                  <p className="text-xs font-medium mb-2 text-gray-400">Mô tả</p>
                  <div 
                    className="p-3 rounded-lg text-xs leading-relaxed max-h-[200px] overflow-y-auto text-gray-300"
                    style={{ background: '#1a1a1a' }}
                  >
                    {fullPromptText || selectedItem.prompt_excerpt}
                  </div>
                </div>
              )}

              {/* Hành động */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleUseAsReference}
                  disabled={loadingPrompt}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-70 text-white"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                >
                  {loadingPrompt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang lấy prompt...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Dùng làm tham khảo
                    </>
                  )}
                </button>
                <div className="flex gap-2">
                  <a
                    href={selectedItem.output_image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition text-gray-300 hover:text-white"
                    style={{ background: '#1a1a1a', border: '1px solid #333' }}
                  >
                    <Download className="w-4 h-4" />
                    Tải về
                  </a>
                  <a
                    href={`https://promptsref.com/share/${selectedItem.share_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition text-gray-300 hover:text-white"
                    style={{ background: '#1a1a1a', border: '1px solid #333' }}
                  >
                    Xem gốc
                  </a>
                </div>
              </div>
            </div>

            {/* Nút đóng */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute -top-2 -right-2 p-2 rounded-full transition hover:bg-white/10"
              style={{ background: '#1a1a1a', border: '1px solid #333' }}
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
