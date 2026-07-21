'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Eye, Sparkles, RotateCcw, Download, MessageSquare, Theater, HelpCircle, Plus, Trash2, GripVertical } from 'lucide-react';
import { TrainingPhrase, TrainingScenario, TrainingFAQ, TrainingCategory } from '@/types';

export const DEFAULT_AI_RULES = [
  'Chỉ trả lời câu hỏi liên quan đến nha khoa',
  'Luôn xưng hô "em" với khách hàng',
  'Nếu chưa rõ cách xưng hô, hỏi một lần: "Em nên xưng hô với mình là anh/chị hay gọi em cho tiện ạ?"',
  'Nếu khách tự xưng hoặc cho biết tuổi nhỏ hơn, giữ cách gọi phù hợp trong các tin nhắn sau',
  'Không được tự nhận mình là chatbot, AI, robot hoặc trợ lý ảo',
  'Khi khách hỏi bạn là ai, hãy giới thiệu là tư vấn viên chăm sóc khách hàng của phòng khám',
  'Nếu khách hỏi lại cùng ý, không lặp nguyên văn câu trước đó; hãy đổi cách diễn đạt và hỏi tiếp nhu cầu cụ thể',
  'Luôn đọc lịch sử chat để biết khách đã cung cấp thông tin gì rồi mới hỏi tiếp phần còn thiếu',
  'Không kết thúc bằng câu chung chung như "cần thêm thông tin cứ hỏi em" nếu đã biết khách đang quan tâm dịch vụ cụ thể',
  'Sau khi trả lời ý chính, chỉ hỏi 1 câu tiếp theo cụ thể nhất để tư vấn hoặc chốt lịch',
  'Giữ câu trả lời ngắn gọn, dưới 100 từ',
  'Nếu không biết, chuyển cho bác sĩ tư vấn',
  'Luôn hỏi thêm thông tin để tư vấn chính xác',
];

function RulesEditor({ rules, onChange }: { rules: string[]; onChange: (rules: string[]) => void }) {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newRule, setNewRule] = useState('');

  useEffect(() => {
    if (editIdx !== null) {
      setEditValue(rules[editIdx] || '');
    }
  }, [editIdx, rules]);

  const startEdit = (idx: number) => { setEditIdx(idx); setEditValue(rules[idx]); };
  const saveEdit = () => {
    if (editIdx === null) return;
    if (editValue.trim()) {
      const r = [...rules]; r[editIdx] = editValue.trim(); onChange(r);
    }
    setEditIdx(null); setEditValue('');
  };
  const deleteRule = (idx: number) => onChange(rules.filter((_, i) => i !== idx));
  const addRule = () => {
    if (!newRule.trim()) return;
    onChange([...rules, newRule.trim()]); setNewRule('');
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>AI Rules</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          Quy tắc chatbot tuân theo khi trả lời. Click để sửa, kéo để sắp xếp.
        </p>
        <div className="space-y-1.5">
          {rules.map((rule, i) => (
            <div 
              key={i} 
              className="group flex items-start gap-2 p-2.5 rounded-lg transition"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <GripVertical className="w-3.5 h-3.5 mt-0.5 shrink-0 cursor-grab" style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-xs font-semibold mt-0.5 shrink-0" style={{ color: 'var(--accent)' }}>{i + 1}.</span>
              {editIdx === i ? (
                <div className="flex-1 flex gap-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditIdx(null); }}
                    className="flex-1 px-2 py-1 rounded text-xs outline-none"
                    style={{ 
                      background: 'var(--bg-primary)', 
                      border: '1px solid var(--accent)',
                      color: 'var(--text-primary)'
                    }}
                    autoFocus
                  />
                  <button 
                    onClick={saveEdit} 
                    className="px-2 py-1 text-[10px] rounded font-medium"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    OK
                  </button>
                  <button 
                    onClick={() => setEditIdx(null)} 
                    className="px-2 py-1 text-[10px]"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <span
                  onClick={() => startEdit(i)}
                  className="flex-1 text-xs cursor-pointer"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {rule}
                </span>
              )}
              <button
                onClick={() => deleteRule(i)}
                className="opacity-0 group-hover:opacity-100 p-0.5 transition shrink-0 hover:text-red-400"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Add new rule */}
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRule()}
            placeholder="Thêm quy tắc mới..."
            className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
            style={{ 
              background: 'var(--bg-primary)', 
              border: '1px solid var(--border)',
              color: 'var(--text-primary)'
            }}
          />
          <button
            onClick={addRule}
            disabled={!newRule.trim()}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg disabled:opacity-40 transition"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Plus className="w-3 h-3" /> Thêm
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  content: string;
  onChange: (val: string) => void;
  phrases: TrainingPhrase[];
  scenarios: TrainingScenario[];
  faqs: TrainingFAQ[];
  categories: TrainingCategory[];
  onImport: () => void;
  onOpenKnowledge: () => void;
  onOpenPromptLibrary: () => void;
  rules: string[];
  onRulesChange: (rules: string[]) => void;
}

export default function PromptEditor({ content, onChange, phrases, scenarios, faqs, categories, onImport, onOpenKnowledge, onOpenPromptLibrary, rules, onRulesChange }: Props) {
  const [editorTab, setEditorTab] = useState<'edit' | 'preview' | 'rules' | 'data'>('edit');

  const tabs = [
    { id: 'edit' as const, label: 'Hướng dẫn', icon: BookOpen },
    { id: 'preview' as const, label: 'Xem mẫu', icon: Eye },
    { id: 'rules' as const, label: 'AI rules', icon: Sparkles },
    { id: 'data' as const, label: 'Viết lại', icon: RotateCcw },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Tabs */}
      <div 
        className="h-11 flex items-center px-4 gap-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'preview') {
                  onOpenPromptLibrary();
                } else {
                  setEditorTab(tab.id);
                }
              }}
              className="flex items-center gap-1.5 text-[13px] font-medium transition"
              style={{ 
                color: editorTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)'
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {editorTab === 'edit' && (
          <div className="p-4">
            <textarea
              value={content}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-full min-h-[500px] text-sm leading-relaxed font-mono resize-none outline-none"
              style={{ 
                background: 'transparent',
                color: 'var(--text-primary)'
              }}
              placeholder="## Nhân vật&#10;Bạn là 1 chuyên gia..."
            />
          </div>
        )}

        {editorTab === 'preview' && (
          <div className="p-4">
            <div 
              className="text-sm whitespace-pre-wrap leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {content}
            </div>
          </div>
        )}

        {editorTab === 'rules' && (
          <RulesEditor rules={rules} onChange={onRulesChange} />
        )}

        {editorTab === 'data' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Dữ liệu đào tạo
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={onOpenKnowledge} 
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  <Download className="w-3 h-3" /> Kho kiến thức
                </button>
                <button 
                  onClick={onImport} 
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition"
                  style={{ 
                    background: 'var(--bg-elevated)', 
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <Download className="w-3 h-3" /> Auto Import
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div 
                className="rounded-lg p-3 text-center"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <MessageSquare className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--accent)' }} />
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{phrases.length}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Mẫu câu</p>
              </div>
              <div 
                className="rounded-lg p-3 text-center"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <Theater className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--accent-purple)' }} />
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{scenarios.length}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Tình huống</p>
              </div>
              <div 
                className="rounded-lg p-3 text-center"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <HelpCircle className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--accent-yellow)' }} />
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{faqs.length}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>FAQ</p>
              </div>
            </div>

            {/* Recent phrases */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Mẫu câu gần đây
              </p>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {phrases.slice(0, 10).map((p) => (
                  <div 
                    key={p.id} 
                    className="p-2 rounded-lg"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                  >
                    <p className="text-[11px] font-medium mb-0.5" style={{ color: 'var(--accent)' }}>{p.intent}</p>
                    <p className="text-xs line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{p.user_message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
