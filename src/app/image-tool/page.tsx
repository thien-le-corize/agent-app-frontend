'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Heart, Eye, Download, X, Loader2, Sparkles, Plus, Search, 
  Image as ImageIcon, Trash2, Expand, History, BookOpen, Wand2, Bookmark
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface WorkItem {
  id: number;
  user_name: string;
  user_avatar: string;
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

const MODELS = [
  { id: 'gpt-image-2', name: 'GPT Image 2', selected: true },
];

const QUALITY_OPTIONS = ['1K', '2K', '4K'];
const BATCH_OPTIONS = [1, 2, 3, 4];
const ASPECT_RATIOS = ['Tự động', '1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9'];

function ImageToolContent() {
  // Left panel state
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState(['gpt-image-2']);
  const [quality, setQuality] = useState('1K');
  const [batchCount, setBatchCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('Auto');
  const [publishToExplore, setPublishToExplore] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  // Right panel state
  const [activeTab, setActiveTab] = useState<'library' | 'history' | 'effects' | 'saved'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  // Load from URL params (khi click từ gallery)
  useEffect(() => {
    const refImage = searchParams.get('ref');
    const promptParam = searchParams.get('prompt');
    
    if (refImage) {
      setReferenceImages([decodeURIComponent(refImage)]);
    }
    if (promptParam) {
      setPrompt(decodeURIComponent(promptParam));
    }
  }, [searchParams]);

  // Fetch gallery images
  const fetchImages = useCallback(async (currentOffset: number, reset = false) => {
    if (loading) return;
    setLoading(true);
    
    try {
      const res = await fetch(
        `/api/gallery?limit=24&offset=${currentOffset}&sort=latest&model=gpt-image`
      );
      const data: ApiResponse = await res.json();
      
      if (reset || currentOffset === 0) {
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

  useEffect(() => {
    fetchImages(0);
  }, []);

  // Infinite scroll for gallery
  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    const handleScroll = () => {
      if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 200) {
        if (hasMore && !loading) {
          fetchImages(offset);
        }
      }
    };

    gallery.addEventListener('scroll', handleScroll);
    return () => gallery.removeEventListener('scroll', handleScroll);
  }, [offset, hasMore, loading, fetchImages]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (referenceImages.length >= 16) {
        toast.error('Maximum 16 reference images');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setReferenceImages(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Add image from gallery as reference
  const handleAddFromGallery = async (item: WorkItem) => {
    if (referenceImages.length >= 16) {
      toast.error('Tối đa 16 hình tham khảo');
      return;
    }
    
    // Add reference image
    setReferenceImages(prev => [...prev, item.output_image_url]);
    
    // Fetch full prompt from API
    if (item.share_id) {
      toast.loading('Đang lấy prompt...', { id: 'fetch-prompt' });
      try {
        const res = await fetch(`/api/gallery/prompt?share_id=${item.share_id}`);
        const data = await res.json();
        if (data.prompt) {
          setPrompt(data.prompt);
          toast.success('Đã thêm hình và prompt', { id: 'fetch-prompt' });
        } else {
          setPrompt(item.prompt_excerpt || '');
          toast.success('Đã thêm làm tham khảo', { id: 'fetch-prompt' });
        }
      } catch {
        setPrompt(item.prompt_excerpt || '');
        toast.success('Đã thêm làm tham khảo', { id: 'fetch-prompt' });
      }
    } else {
      setPrompt(item.prompt_excerpt || '');
      toast.success('Đã thêm làm tham khảo');
    }
  };

  // Remove reference image
  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle model selection
  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  // Generate image (mock)
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    
    setGenerating(true);
    toast.loading('Generating image...', { id: 'generating' });
    
    // Simulate API call
    setTimeout(() => {
      // Mock generated images
      const mockResults = Array(batchCount).fill(null).map((_, i) => 
        `https://picsum.photos/seed/${Date.now() + i}/1024`
      );
      setGeneratedImages(mockResults);
      setGenerating(false);
      toast.success('Images generated!', { id: 'generating' });
    }, 3000);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffMs / 86400000)}d`;
  };

  return (
    <div className="h-screen flex" style={{ background: '#0a0a0a' }}>
      <Toaster position="top-center" />
      
      {/* Left Panel - Controls */}
      <div 
        className="w-[420px] shrink-0 flex flex-col overflow-y-auto"
        style={{ background: '#111', borderRight: '1px solid #222' }}
      >
        <div className="p-5 space-y-5">
          {/* Header */}
          <div>
            <h1 className="text-xl font-bold text-orange-500">
              Tạo Ảnh AI Miễn Phí
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Tạo ảnh chất lượng cao từ prompt hoặc hình tham khảo.
            </p>
          </div>

          {/* Reference Images */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Hình tham khảo (tối đa 16)
            </label>
            <div className="flex flex-wrap gap-2">
              {referenceImages.map((img, idx) => (
                <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeReferenceImage(idx)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              {referenceImages.length < 16 && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-600 hover:border-gray-500 flex items-center justify-center transition"
                  >
                    <Plus className="w-5 h-5 text-gray-500" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                Mô tả ảnh <Wand2 className="w-3.5 h-3.5 text-gray-500" />
              </label>
              <span className="text-xs text-gray-500">{prompt.length}/20000</span>
            </div>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Mô tả hình ảnh bạn muốn tạo..."
                className="w-full h-28 px-3 py-2.5 rounded-lg text-sm resize-none outline-none transition"
                style={{ background: '#1a1a1a', border: '1px solid #333', color: '#eee' }}
              />
              <button className="absolute bottom-2 right-2 p-1.5 rounded hover:bg-white/10">
                <Expand className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Models */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Chọn Model (có thể chọn nhiều)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MODELS.map(model => (
                <button
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                    selectedModels.includes(model.id)
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                      : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                  style={{ border: '1px solid' }}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    selectedModels.includes(model.id) ? 'bg-purple-600 border-purple-600' : 'border-gray-600'
                  }`}>
                    {selectedModels.includes(model.id) && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  {model.name}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Chất lượng</label>
            <div className="flex gap-2">
              {QUALITY_OPTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
                    quality === q
                      ? 'bg-gray-700 text-white'
                      : 'bg-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Count */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Số lượng ảnh</label>
            <div className="flex gap-2">
              {BATCH_OPTIONS.map(b => (
                <button
                  key={b}
                  onClick={() => setBatchCount(b)}
                  className={`w-9 h-9 rounded-lg text-xs font-medium transition ${
                    batchCount === b
                      ? 'bg-gray-700 text-white'
                      : 'bg-transparent text-gray-500 hover:text-gray-300 border border-gray-700'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Tỉ lệ khung hình</label>
            <div className="flex flex-wrap gap-2">
              {ASPECT_RATIOS.map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                    aspectRatio === ratio
                      ? 'bg-gray-700 text-white'
                      : 'bg-transparent text-gray-500 hover:text-gray-300 border border-gray-700'
                  }`}
                >
                  {ratio !== 'Auto' && <div className="w-3 h-3 border border-current rounded-sm" />}
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {/* Credits Info */}
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#1a1a1a' }}>
            <div>
              <p className="text-xs text-gray-400">Tổng credits</p>
              <p className="text-sm font-medium text-white">{selectedModels.length * batchCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">GPT Image 2</p>
              <p className="text-sm font-medium text-white">{batchCount}</p>
            </div>
          </div>

          {/* Publish Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300 flex items-center gap-1">
              Công khai lên thư viện <span className="text-yellow-500">👋</span>
            </label>
            <button
              onClick={() => setPublishToExplore(!publishToExplore)}
              className={`w-11 h-6 rounded-full transition relative ${
                publishToExplore ? 'bg-purple-600' : 'bg-gray-700'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                publishToExplore ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Tạo ảnh ngay
          </button>

          {/* Generated Results */}
          {generatedImages.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Ảnh đã tạo</label>
              <div className="grid grid-cols-2 gap-2">
                {generatedImages.map((img, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden group">
                    <img src={img} alt="" className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <a href={img} target="_blank" rel="noreferrer" className="p-2 bg-white/90 rounded-lg">
                        <Download className="w-4 h-4 text-gray-700" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Gallery */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 py-3" style={{ borderBottom: '1px solid #222' }}>
          {[
            { id: 'history', label: 'Lịch sử', icon: History },
            { id: 'library', label: 'Thư viện Prompt', icon: BookOpen },
            { id: 'effects', label: 'AI Effects', icon: Wand2 },
            { id: 'saved', label: 'Đã lưu', icon: Bookmark },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm prompt..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: '#1a1a1a', border: '1px solid #333', color: '#eee' }}
            />
          </div>
        </div>

        {/* Gallery Grid */}
        <div 
          ref={galleryRef}
          className="flex-1 overflow-y-auto px-5 pb-5"
        >
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="break-inside-avoid group relative rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-xl"
                style={{ background: '#1a1a1a' }}
                onClick={() => handleAddFromGallery(item)}
              >
                <img
                  src={item.output_image_url}
                  alt=""
                  className="w-full object-cover"
                  loading="lazy"
                />
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center gap-3 text-white/80 text-xs">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" />
                        <span>{item.likes_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{item.view_count}</span>
                      </div>
                      <span className="ml-auto">{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                  
                  {/* Add button */}
                  <div className="absolute top-2 right-2">
                    <button 
                      className="p-2 bg-purple-600 rounded-lg text-white text-xs font-medium hover:bg-purple-700 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddFromGallery(item);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ImageToolPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    }>
      <ImageToolContent />
    </Suspense>
  );
}
