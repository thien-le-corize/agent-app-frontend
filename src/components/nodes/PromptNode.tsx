'use client';

import { useState, useEffect } from 'react';
import { Handle, NodeResizer, Position } from 'reactflow';
import { MessageSquare, Check, ChevronDown, ClipboardList } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface PromptNodeProps {
  selected?: boolean;
  data: {
    prompt?: string;
    onChange?: (val: string) => void;
    onDelete?: () => void;
  };
}

const PROMPT_TEMPLATES = [
  {
    label: 'Thay nhân vật',
    prompt: `Giữ nguyên bố cục, màu sắc, phong cách thiết kế và toàn bộ nội dung quảng cáo của ảnh tham khảo.
Chỉ thay nhân vật trong ảnh tham khảo bằng nhân vật từ ảnh đầu vào.
Nhân vật mặc trang phục kín đáo, chuyên nghiệp, phù hợp quảng cáo nha khoa.
Không thay đổi logo, headline, ưu đãi, icon, bố cục, nền và các text khác nếu không cần.`,
  },
  {
    label: 'Đổi thiết kế',
    prompt: `Giữ nguyên nhân vật/sản phẩm từ ảnh đầu vào.
Thiết kế lại toàn bộ poster theo phong cách quảng cáo nha khoa chuyên nghiệp, hiện đại và sạch sẽ.
Có thể thay đổi bố cục, màu sắc, typography, nền, icon và cách trình bày ưu đãi.
Nhân vật mặc trang phục kín đáo, non-sexual, phù hợp quảng cáo chuyên nghiệp.
Nội dung text lấy theo prompt người dùng và brand hiện tại.`,
  },
  {
    label: 'Thay text',
    prompt: `Giữ nguyên bố cục, hình ảnh chính, màu sắc và phong cách của ảnh tham khảo.
Chỉ thay toàn bộ text cũ trong ảnh tham khảo bằng nội dung mới từ prompt người dùng và brand hiện tại.
Không giữ lại headline, ưu đãi, giá, CTA, địa chỉ, số điện thoại hoặc footer text cũ.
Kết quả là quảng cáo nha khoa chuyên nghiệp, rõ chữ, dễ đọc.`,
  },
  {
    label: 'Biến thể mới',
    prompt: `Dựa vào ảnh tham khảo để lấy phong cách quảng cáo, màu sắc, bố cục tổng thể và cảm giác thiết kế.
Tạo một phiên bản poster mới khác rõ ràng về bố cục, crop, vị trí nhân vật, typography và badge ưu đãi.
Giữ đúng brand hiện tại và nội dung chính từ prompt người dùng.
Output phải là quảng cáo chuyên nghiệp, trang phục kín đáo, non-sexual, phù hợp nha khoa.`,
  },
];

function PromptNode({ data, selected }: PromptNodeProps) {
  const { prompt = '', onChange, onDelete } = data;
  const [localPrompt, setLocalPrompt] = useState(prompt);
  const [templateOpen, setTemplateOpen] = useState(false);

  useEffect(() => { setLocalPrompt(prompt); }, [prompt]);

  const handleChange = (val: string) => {
    setLocalPrompt(val);
    onChange?.(val);
  };

  const applyTemplate = (val: string) => {
    handleChange(val);
    setTemplateOpen(false);
  };

  return (
    <NodeWrapper onDelete={onDelete}>
      <NodeResizer
        isVisible={selected}
        minWidth={300}
        minHeight={190}
        maxWidth={800}
        maxHeight={650}
        lineClassName="!border-emerald-500/70"
        handleClassName="!h-2.5 !w-2.5 !border-emerald-400 !bg-[#141414]"
      />
      <div
        className="node-card nowheel relative flex h-full min-h-[190px] min-w-[300px] flex-col"
        style={{ width: '100%', height: '100%', background: '#141414', border: '1px solid #2a2a2a' }}
      >
        {/* Header */}
        <div className="node-header" style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '8px 12px' }}>
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-gray-200 font-semibold text-[11px]">Prompt</span>
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTemplateOpen((open) => !open);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[9px] font-medium text-emerald-300 hover:bg-emerald-500/20"
              title="Chọn prompt mẫu"
            >
              <ClipboardList className="h-3 w-3" />
              Mẫu
              <ChevronDown className="h-3 w-3" />
            </button>
            {localPrompt.length > 0 && (
              <span className="text-[9px] text-gray-600">{localPrompt.length} chars</span>
            )}
            {localPrompt.trim().length > 0
              ? <Check className="w-3 h-3 text-emerald-400" />
              : <div className="w-2 h-2 rounded-full bg-emerald-500" />
            }
          </div>
        </div>

        {templateOpen && (
          <div
            className="absolute right-2 top-9 z-50 w-56 rounded-lg border border-[#2a2a2a] bg-[#181818] p-1 shadow-2xl"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {PROMPT_TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  applyTemplate(template.prompt);
                }}
                className="block w-full rounded-md px-2.5 py-2 text-left text-[10px] font-medium text-gray-300 hover:bg-[#252525] hover:text-white"
              >
                {template.label}
              </button>
            ))}
          </div>
        )}

        {/* Textarea chiếm full */}
        <div className="flex min-h-0 flex-1 p-0">
          <textarea
            value={localPrompt}
            onChange={e => handleChange(e.target.value)}
            className="h-full w-full bg-transparent text-[11px] text-gray-300 leading-relaxed outline-none resize-none px-3 py-2.5"
            style={{ minHeight: 120 }}
            placeholder="Mô tả ý tưởng sáng tạo của bạn..."
            onPointerDown={e => e.stopPropagation()}
          />
        </div>

        {/* Footer hint */}
        {localPrompt.trim().length === 0 && (
          <div className="px-3 pb-2.5">
            <p className="text-[9px] text-gray-600">Nhập prompt rồi nhấn <span className="text-red-400">Run ▶</span></p>
          </div>
        )}

        <Handle type="target" position={Position.Left} style={{ background: '#22c55e' }} />
        <Handle type="source" position={Position.Right} style={{ background: '#22c55e' }} />
      </div>
    </NodeWrapper>
  );
}

export default PromptNode;
