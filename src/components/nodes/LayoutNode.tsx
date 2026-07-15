'use client';

import { Handle, Position } from 'reactflow';
import { LayoutTemplate } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

export interface LayoutNodeConfig {
  preset: string;
  ratio: string;
  subjectPosition: string;
  textPosition: string;
  logoPosition: string;
  style: string;
}

interface LayoutNodeProps {
  data: {
    config?: LayoutNodeConfig;
    onChange?: (config: LayoutNodeConfig) => void;
    onDelete?: () => void;
  };
}

const DEFAULT_CONFIG: LayoutNodeConfig = {
  preset: 'hero',
  ratio: '1:1',
  subjectPosition: 'right',
  textPosition: 'left',
  logoPosition: 'top-left',
  style: 'clean dental clinic poster, modern healthcare advertising',
};

const PRESETS = [
  { value: 'hero', label: 'Hero sản phẩm' },
  { value: 'split', label: 'Chia đôi' },
  { value: 'center', label: 'Chủ thể giữa' },
  { value: 'diagonal', label: 'Đường chéo động' },
  { value: 'badge', label: 'Sale badge lớn' },
  { value: 'minimal', label: 'Tối giản cao cấp' },
];

export function layoutConfigToPrompt(config: LayoutNodeConfig) {
  const presetText: Record<string, string> = {
    hero: 'Hero layout with one dominant main subject, strong headline, clear offer, and clean CTA/footer.',
    split: 'Split layout with subject and key visual separated into two clear zones.',
    center: 'Centered layout with main subject in the middle and typography wrapping around it.',
    diagonal: 'Dynamic diagonal layout with motion lines, angled bands, and energetic depth.',
    badge: 'Promotion-first layout with a large discount badge, sticker elements, and strong offer hierarchy.',
    minimal: 'Premium minimal layout with generous white space, elegant typography, and restrained decoration.',
  };

  return [
    `Image layout preset: ${presetText[config.preset] || presetText.hero}`,
    `Canvas ratio: ${config.ratio}.`,
    `Main subject position: ${config.subjectPosition}.`,
    `Headline/text position: ${config.textPosition}.`,
    `Brand logo position: ${config.logoPosition}.`,
    `Visual style: ${config.style}.`,
    'Keep the composition readable, balanced, and suitable for a professional healthcare marketing poster.',
  ].join('\n');
}

function LayoutNode({ data }: LayoutNodeProps) {
  const config = { ...DEFAULT_CONFIG, ...(data.config || {}) };

  const update = (patch: Partial<LayoutNodeConfig>) => {
    data.onChange?.({ ...config, ...patch });
  };

  return (
    <NodeWrapper onDelete={data.onDelete}>
      <div className="node-card nowheel" style={{ width: 260, background: '#141414', border: '1px solid #312e81' }}>
        <div className="node-header" style={{ background: '#171528', borderBottom: '1px solid #312e81', padding: '8px 10px' }}>
          <LayoutTemplate className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-gray-200 font-semibold text-[11px]">Bố cục hình ảnh</span>
        </div>

        <div className="p-2.5 space-y-2">
          <select value={config.preset} onChange={e => update({ preset: e.target.value })} className="node-field !py-1.5 !text-[10px]" onPointerDown={e => e.stopPropagation()}>
            {PRESETS.map(preset => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <select value={config.ratio} onChange={e => update({ ratio: e.target.value })} className="node-field !py-1.5 !text-[10px]" onPointerDown={e => e.stopPropagation()}>
              <option value="1:1">1:1</option>
              <option value="4:5">4:5</option>
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
            </select>
            <select value={config.logoPosition} onChange={e => update({ logoPosition: e.target.value })} className="node-field !py-1.5 !text-[10px]" onPointerDown={e => e.stopPropagation()}>
              <option value="top-left">Logo trên trái</option>
              <option value="top-right">Logo trên phải</option>
              <option value="bottom-left">Logo dưới trái</option>
              <option value="bottom-right">Logo dưới phải</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select value={config.subjectPosition} onChange={e => update({ subjectPosition: e.target.value })} className="node-field !py-1.5 !text-[10px]" onPointerDown={e => e.stopPropagation()}>
              <option value="right">Chủ thể phải</option>
              <option value="left">Chủ thể trái</option>
              <option value="center">Chủ thể giữa</option>
              <option value="bottom">Chủ thể dưới</option>
            </select>
            <select value={config.textPosition} onChange={e => update({ textPosition: e.target.value })} className="node-field !py-1.5 !text-[10px]" onPointerDown={e => e.stopPropagation()}>
              <option value="left">Text trái</option>
              <option value="right">Text phải</option>
              <option value="top">Text trên</option>
              <option value="bottom">Text dưới</option>
            </select>
          </div>

          <textarea
            value={config.style}
            onChange={e => update({ style: e.target.value })}
            className="node-field resize-none !text-[10px]"
            rows={2}
            placeholder="Style bổ sung..."
            onPointerDown={e => e.stopPropagation()}
          />

          <div className="rounded-lg px-2 py-1.5 text-[9px] leading-relaxed text-indigo-200/70" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.16)' }}>
            {layoutConfigToPrompt(config)}
          </div>
        </div>

        <Handle type="target" position={Position.Left} style={{ background: '#818cf8' }} />
        <Handle type="source" position={Position.Right} style={{ background: '#818cf8' }} />
      </div>
    </NodeWrapper>
  );
}

export default LayoutNode;
