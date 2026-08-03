'use client';

import { DragEvent } from 'react';
import type { Project } from '@/types';
import {
  Palette,
  FileText,
  ImageIcon,
  MessageSquare,
  Sparkles,
  Video,
  Type,
  Wand2,
  Search,
  ChevronDown,
  ImagePlus,
  LayoutTemplate,
  FolderOpen,
  Plus,
} from 'lucide-react';

export interface NodeTypeInfo {
  type: string;
  label: string;
  icon: any;
  color: string;
  description: string;
}

export const NODE_TYPES_LIST: NodeTypeInfo[] = [
  { type: 'brand',      label: 'Thương hiệu',    icon: Palette,       color: 'violet',  description: 'Chọn thương hiệu' },
  { type: 'input',      label: 'Ảnh ghép vào',   icon: ImagePlus,     color: 'blue',    description: 'Người/sản phẩm ghép trực tiếp vào ảnh' },
  { type: 'references', label: 'Hình tham khảo', icon: ImageIcon,     color: 'amber',   description: 'Layout/style reference' },
  { type: 'image',      label: 'Image Source',   icon: ImageIcon,     color: 'cyan',    description: 'Ảnh input khác' },
  { type: 'aiprompt',   label: 'Prompt AI',      icon: Wand2,         color: 'purple',  description: 'AI tạo prompt từ thương hiệu' },
  { type: 'template',   label: 'Mẫu prompt',     icon: FileText,      color: 'indigo',  description: 'Prompt mẫu' },
  { type: 'prompt',     label: 'Prompt',         icon: MessageSquare, color: 'emerald', description: 'Nhập prompt thủ công' },
  { type: 'storyboardImage', label: 'Ảnh Storybook', icon: ImageIcon, color: 'blue', description: 'Ảnh tham chiếu truyền sang video Omni' },
  { type: 'generate',   label: 'Tạo ảnh',        icon: Sparkles,      color: 'rose',    description: 'Tạo hình ảnh' },
  { type: 'video',      label: 'Tạo video',      icon: Video,         color: 'red',     description: 'Tạo video' },
  { type: 'text',       label: 'Văn bản',        icon: Type,          color: 'gray',    description: 'Thêm nội dung vào prompt' },
];

// Map màu cho icon backgrounds - sử dụng accent colors mới
const iconBgMap: Record<string, string> = {
  violet: 'bg-violet-500/20 text-violet-400',
  blue: 'bg-blue-500/20 text-blue-400',
  amber: 'bg-amber-500/20 text-amber-400',
  emerald: 'bg-emerald-500/20 text-emerald-400',
  indigo: 'bg-indigo-500/20 text-indigo-400',
  rose: 'bg-rose-500/20 text-rose-400',
  red: 'bg-red-500/20 text-red-400',
  cyan: 'bg-cyan-500/20 text-cyan-400',
  gray: 'bg-gray-500/20 text-gray-400',
  purple: 'bg-purple-500/20 text-purple-400',
  sky: 'bg-sky-500/20 text-sky-400',
};

interface NodePaletteProps {
  onOpenWorkflowTemplates?: () => void;
  projects?: Project[];
  selectedProjectId?: string;
  selectedBrandName?: string;
  newProjectName?: string;
  creatingProject?: boolean;
  onSelectProject?: (projectId: string) => void;
  onNewProjectNameChange?: (name: string) => void;
  onCreateProject?: () => void;
}

export default function NodePalette({
  onOpenWorkflowTemplates,
  projects = [],
  selectedProjectId = '',
  selectedBrandName,
  newProjectName = '',
  creatingProject = false,
  onSelectProject,
  onNewProjectNameChange,
  onCreateProject,
}: NodePaletteProps) {
  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="node-palette">
      {/* Header */}
      <div 
        className="px-4 py-3"
        style={{ borderBottom: '1px solid var(--panel-border)' }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent)' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Studio
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--panel-border)' }}>
        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Tìm module..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-[12px] outline-none"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {onOpenWorkflowTemplates && (
        <div className="space-y-3 px-3 py-3" style={{ borderBottom: '1px solid var(--panel-border)' }}>
          <button
            type="button"
            onClick={onOpenWorkflowTemplates}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition hover:opacity-90"
            style={{ background: 'var(--accent)', color: '#ffffff' }}
          >
            <LayoutTemplate className="h-4 w-4" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold leading-tight">Chọn template</p>
              <p className="text-[10px] leading-tight text-white/75">Mở mẫu workflow nhanh</p>
            </div>
          </button>

          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Dự án
                </p>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{projects.length}</span>
            </div>

            {selectedBrandName ? (
              <div className="space-y-1.5">
                <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                  {projects.length === 0 ? (
                    <p className="rounded-lg px-2 py-2 text-[11px]" style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
                      Chưa có dự án cho brand này
                    </p>
                  ) : projects.map((project) => {
                    const active = project.id === selectedProjectId;
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => onSelectProject?.(project.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-[var(--bg-hover)]"
                        style={{
                          background: active ? 'var(--accent-muted)' : 'transparent',
                          border: active ? '1px solid var(--accent)' : '1px solid transparent',
                          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                        title={project.name}
                      >
                        <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }} />
                        <span className="truncate text-[12px] font-medium">{project.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-1.5">
                  <input
                    value={newProjectName}
                    onChange={(event) => onNewProjectNameChange?.(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') onCreateProject?.();
                    }}
                    placeholder={`Dự án ${selectedBrandName}`}
                    className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-[11px] outline-none"
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={onCreateProject}
                    disabled={!newProjectName.trim() || creatingProject}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-white disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: 'var(--accent)' }}
                    title={`Tạo dự án cho ${selectedBrandName}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="rounded-lg px-2 py-2 text-[11px]" style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
                Chọn brand để xem dự án
              </p>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--panel-border)' }}>
        <a 
          href="/workflow" 
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /> 
          Workflow
        </a>
        <a 
          href="/chatbot-list" 
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <MessageSquare className="w-3.5 h-3.5" /> 
          Chatbot
        </a>
        <a 
          href="/crm" 
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <FileText className="w-3.5 h-3.5" /> 
          CRM
        </a>
      </div>

      {/* Modules */}
      <div className="px-3 pt-3 pb-2 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-1 mb-2">
          <p 
            className="text-[11px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Module
          </p>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
        </div>
        
        <div className="space-y-1">
          {NODE_TYPES_LIST.map((nodeInfo) => {
            const Icon = nodeInfo.icon;
            return (
              <div
                key={nodeInfo.type}
                draggable
                onDragStart={(e) => onDragStart(e, nodeInfo.type)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all hover:bg-[var(--bg-hover)]"
                style={{ border: '1px solid transparent' }}
                title={nodeInfo.description}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${iconBgMap[nodeInfo.color]}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[12px] leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {nodeInfo.label}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {nodeInfo.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
