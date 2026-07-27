'use client';

import { useState } from 'react';
import { X, Star, Search } from 'lucide-react';
import { Node, Edge } from 'reactflow';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  nodeCount: number;
  category: 'preset' | 'favorite';
  nodes: Node[];
  edges: Edge[];
}

// Workflow templates chính cho người dùng chọn nhanh.
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'image-workflow',
    name: 'Tạo ảnh GPT Image',
    description: 'Brand + ảnh đầu vào + reference + prompt → tạo ảnh quảng cáo',
    thumbnail: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=300&fit=crop&q=80',
    nodeCount: 6,
    category: 'preset',
    nodes: [
      { id: 'brand-1', type: 'brand', position: { x: 40, y: 40 }, data: {} },
      { id: 'input-1', type: 'input', position: { x: 40, y: 255 }, data: { label: 'Ảnh đầu vào' } },
      { id: 'references-1', type: 'references', position: { x: 360, y: 135 }, data: {} },
      { id: 'prompt-1', type: 'prompt', position: { x: 360, y: 380 }, data: {}, style: { width: 360, height: 240 } },
      { id: 'generate-1', type: 'generate', position: { x: 745, y: 180 }, data: {} },
      { id: 'generate-2', type: 'generate', position: { x: 745, y: 545 }, data: {} },
    ],
    edges: [
      { id: 'e-brand-prompt', source: 'brand-1', target: 'prompt-1', animated: true },
      { id: 'e-input-prompt', source: 'input-1', target: 'prompt-1', animated: true },
      { id: 'e-reference-prompt', source: 'references-1', target: 'prompt-1', animated: true },
      { id: 'e-prompt-generate-1', source: 'prompt-1', target: 'generate-1', animated: true },
      { id: 'e-prompt-generate-2', source: 'prompt-1', target: 'generate-2', animated: true },
    ],
  },
  {
    id: 'google-omni-video-workflow',
    name: 'Tạo video Google Omni',
    description: 'Ảnh đầu vào + prompt kịch bản → storyboard → video Google Gemini/Omni',
    thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=300&fit=crop&q=80',
    nodeCount: 4,
    category: 'preset',
    nodes: [
      { id: 'image-1', type: 'image', position: { x: 60, y: 120 }, data: { label: 'Ảnh đầu vào' } },
      {
        id: 'prompt-1',
        type: 'prompt',
        position: { x: 390, y: 120 },
        data: {},
        style: { width: 360, height: 220 },
      },
      {
        id: 'storyboard-1',
        type: 'storyboard',
        position: { x: 800, y: 100 },
        data: {},
        style: { width: 360, height: 260 },
      },
      { id: 'video-1', type: 'video', position: { x: 1210, y: 130 }, data: {} },
    ],
    edges: [
      { id: 'e-image-storyboard', source: 'image-1', target: 'storyboard-1', animated: true },
      { id: 'e-prompt-storyboard', source: 'prompt-1', target: 'storyboard-1', animated: true },
      { id: 'e-storyboard-video', source: 'storyboard-1', target: 'video-1', animated: true },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (template: WorkflowTemplate) => void;
}

export default function WorkflowTemplatesModal({ open, onClose, onSelect }: Props) {
  const [activeTab, setActiveTab] = useState<'preset' | 'favorite'>('preset');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  if (!open) return null;

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const filteredTemplates = WORKFLOW_TEMPLATES.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'favorite' 
      ? favorites.includes(t.id)
      : true;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div
        className="rounded-xl w-[900px] max-h-[700px] flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            My templates
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs + Search */}
        <div
          className="px-6 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('preset')}
              className="px-4 py-2 rounded-lg text-[13px] font-medium transition"
              style={{
                background: activeTab === 'preset' ? 'var(--bg-elevated)' : 'transparent',
                color: activeTab === 'preset' ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              Nodes Preset
            </button>
            <button
              onClick={() => setActiveTab('favorite')}
              className="px-4 py-2 rounded-lg text-[13px] font-medium transition"
              style={{
                background: activeTab === 'favorite' ? 'var(--bg-elevated)' : 'transparent',
                color: activeTab === 'favorite' ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              Favorites
            </button>
          </div>

          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg text-[13px] w-56 outline-none"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {activeTab === 'favorite'
                  ? 'Chưa có template yêu thích'
                  : 'Không tìm thấy template'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => onSelect(template)}
                  className="group cursor-pointer rounded-xl overflow-hidden transition-all hover:ring-2 hover:ring-[var(--accent)]"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    {/* Node count badge */}
                    <span
                      className="absolute top-2 left-2 px-2 py-0.5 rounded text-[11px] font-medium"
                      style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}
                    >
                      {template.nodeCount} Nodes
                    </span>
                    {/* Favorite button */}
                    <button
                      onClick={(e) => toggleFavorite(template.id, e)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition"
                      style={{ background: 'rgba(0,0,0,0.7)' }}
                    >
                      <Star
                        className="w-4 h-4"
                        style={{
                          color: favorites.includes(template.id)
                            ? 'var(--accent-yellow)'
                            : 'white',
                          fill: favorites.includes(template.id)
                            ? 'var(--accent-yellow)'
                            : 'transparent',
                        }}
                      />
                    </button>
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <h3
                      className="text-[13px] font-medium truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {template.name}
                    </h3>
                    <p
                      className="text-[11px] mt-0.5 truncate"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {template.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
