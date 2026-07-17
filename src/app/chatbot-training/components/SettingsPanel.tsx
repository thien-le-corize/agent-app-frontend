'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronRight, ChevronDown, Plus, Clock, Trash2, X, Database, Sparkles, MessageSquare } from 'lucide-react';
import { TrainingStats, TrainingCategory } from '@/types';
import {
  createTrainingCategory,
  deleteTrainingCategory,
  createTrainingPhrase,
} from '@/lib/api';

export interface IdleMessage {
  delay: number; // seconds
  message: string;
}

export interface IdleReminderScenario {
  title: string;
  trigger: string;
  message: string;
}

export interface IdleSettings {
  enabled: boolean;
  delaySeconds: number; // Thời gian chờ chung
  maxReminders: number; // Số lần nhắc tối đa
  context: string; // Context cũ, giữ để tương thích dữ liệu đã lưu
  reminderScenarios: IdleReminderScenario[];
}

interface Props {
  model: string;
  onModelChange: (v: string) => void;
  debugMode: boolean;
  onDebugChange: (v: boolean) => void;
  segments: number;
  onSegmentsChange: (v: number) => void;
  openingQuestions: string[];
  onOpeningQuestionsChange: (v: string[]) => void;
  autoSuggest: boolean;
  onAutoSuggestChange: (v: boolean) => void;
  stats: TrainingStats | null;
  categories: TrainingCategory[];
  onRefresh?: () => void;
  onOpenKnowledge?: () => void;
  phrases?: any[];
  faqs?: any[];
  // Idle settings (simplified)
  idleSettings?: IdleSettings;
  onIdleSettingsChange?: (v: IdleSettings) => void;
}

// Toggle Switch Component
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-10 h-5 rounded-full transition relative"
      style={{ background: checked ? 'var(--accent)' : 'var(--bg-elevated)' }}
    >
      <span 
        className="absolute top-0.5 w-4 h-4 rounded-full shadow transition-transform"
        style={{ 
          background: 'white',
          left: 0,
          transform: checked ? 'translateX(20px)' : 'translateX(2px)'
        }}
      />
    </button>
  );
}

export default function SettingsPanel({
  model, onModelChange, debugMode, onDebugChange, segments, onSegmentsChange,
  openingQuestions, onOpeningQuestionsChange, autoSuggest, onAutoSuggestChange,
  stats, categories, onRefresh, onOpenKnowledge, phrases = [], faqs = [],
  idleSettings = { enabled: true, delaySeconds: 30, maxReminders: 3, context: '', reminderScenarios: [] }, onIdleSettingsChange,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    knowledge: true,
    opening: true,
    suggest: false,
    product: false,
    segments: true,
    addKnowledge: false,
    addPhrase: false,
    idleMessages: true,
  });

  const [newCategory, setNewCategory] = useState('');
  const [phraseForm, setPhraseForm] = useState({ category_id: '', intent: '', user_message: '', bot_response: '' });
  const idleReminderScenarios = idleSettings.reminderScenarios || [];

  const toggle = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await createTrainingCategory({ name: newCategory.trim() });
      toast.success(`Đã thêm: ${newCategory}`);
      setNewCategory('');
      onRefresh?.();
    } catch {
      toast.error('Lỗi khi thêm');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Xóa danh mục này?')) return;
    try {
      await deleteTrainingCategory(id);
      toast.success('Đã xóa');
      onRefresh?.();
    } catch {
      toast.error('Lỗi');
    }
  };

  const handleAddPhrase = async () => {
    if (!phraseForm.category_id || !phraseForm.user_message || !phraseForm.bot_response) {
      toast.error('Vui lòng điền đủ thông tin');
      return;
    }
    try {
      await createTrainingPhrase({
        category_id: phraseForm.category_id,
        intent: phraseForm.intent || 'general',
        user_message: phraseForm.user_message,
        bot_response: phraseForm.bot_response,
      });
      toast.success('Đã thêm mẫu câu');
      setPhraseForm({ category_id: '', intent: '', user_message: '', bot_response: '' });
      onRefresh?.();
    } catch {
      toast.error('Lỗi khi thêm');
    }
  };

  const updateIdleReminderScenario = (index: number, patch: Partial<IdleReminderScenario>) => {
    const next = idleReminderScenarios.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onIdleSettingsChange?.({ ...idleSettings, reminderScenarios: next });
  };

  const addIdleReminderScenario = () => {
    onIdleSettingsChange?.({
      ...idleSettings,
      reminderScenarios: [
        ...idleReminderScenarios,
        {
          title: 'Khách quan tâm nhưng chưa đặt lịch',
          trigger: 'Khách hỏi giá, hỏi ưu đãi, hỏi thời gian điều trị hoặc đã được tư vấn nhưng chưa phản hồi.',
          message: 'Anh/chị muốn em giữ lịch tư vấn miễn phí hôm nay không ạ?',
        },
      ],
    });
  };

  const removeIdleReminderScenario = (index: number) => {
    onIdleSettingsChange?.({
      ...idleSettings,
      reminderScenarios: idleReminderScenarios.filter((_, i) => i !== index),
    });
  };

  const sectionStyle = { borderBottom: '1px solid var(--border)' };
  const inputStyle = {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Model selector */}
      <div className="p-4" style={sectionStyle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Model</span>
          </div>
          <select
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={inputStyle}
          >
            <option value="gpt-4o-mini">GPT-4o mini</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
        </div>
      </div>

      {/* Debug toggle */}
      <div className="px-4 py-3 flex items-center justify-between" style={sectionStyle}>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Debug</span>
        <Toggle checked={debugMode} onChange={onDebugChange} />
      </div>

      {/* Kiến thức */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggle('knowledge')} 
          className="w-full flex items-center justify-between px-4 py-3 transition hover:bg-[var(--bg-hover)]"
        >
          <div className="flex items-center gap-2">
            {expanded.knowledge ? (
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            ) : (
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            )}
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Kiến thức</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); if (onOpenKnowledge) onOpenKnowledge(); else toggle('addKnowledge'); }}
            className="p-1 rounded hover:bg-[var(--bg-elevated)]"
          >
            <Plus className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </button>
        {expanded.knowledge && (
          <div className="px-4 pb-3">
            {expanded.addKnowledge && (
              <div 
                className="mb-3 p-2.5 rounded-lg"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--accent)' }}
              >
                <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Thêm danh mục kiến thức
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    placeholder="VD: Niềng răng, Giá cả..."
                    className="flex-1 px-2.5 py-1.5 rounded-md text-xs outline-none"
                    style={inputStyle}
                    autoFocus
                  />
                  <button
                    onClick={handleAddCategory}
                    className="px-3 py-1.5 text-xs font-medium rounded-md"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    Thêm
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {categories.map((cat) => {
                const catPhrases = phrases.filter((p: any) => p.category_id === cat.id).length;
                const catFaqs = faqs.filter((f: any) => f.category_id === cat.id).length;
                const total = catPhrases + catFaqs;
                return (
                  <div 
                    key={cat.id} 
                    className="flex items-center justify-between p-2 rounded-lg group"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Database className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
                      <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
                      {total > 0 && (
                        <span className="text-[10px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>{total} mục</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 transition hover:text-red-400"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {categories.length === 0 && (
                <p className="text-xs py-2" style={{ color: 'var(--text-tertiary)' }}>
                  Chưa có kiến thức. Nhấn + để thêm.
                </p>
              )}
            </div>
            {stats && (
              <p className="text-[10px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
                {stats.phrases} mẫu câu · {stats.scenarios} tình huống · {stats.faqs} FAQ
              </p>
            )}
          </div>
        )}
      </div>

      {/* Câu hỏi mở đầu */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggle('opening')} 
          className="w-full flex items-center justify-between px-4 py-3 transition hover:bg-[var(--bg-hover)]"
        >
          <div className="flex items-center gap-2">
            {expanded.opening ? (
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            ) : (
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            )}
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Câu hỏi mở đầu</span>
          </div>
          <Clock className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        </button>
        {expanded.opening && (
          <div className="px-4 pb-3 space-y-2">
            {openingQuestions.map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => {
                    const newQ = [...openingQuestions];
                    newQ[i] = e.target.value;
                    onOpeningQuestionsChange(newQ);
                  }}
                  placeholder="Nhập câu hỏi gợi ý..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                  style={inputStyle}
                />
                <button
                  onClick={() => onOpeningQuestionsChange(openingQuestions.filter((_, idx) => idx !== i))}
                  className="p-1 transition hover:text-red-400"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => onOpeningQuestionsChange([...openingQuestions, ''])}
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--accent)' }}
            >
              <Plus className="w-3 h-3" /> Thêm câu hỏi
            </button>
          </div>
        )}
      </div>

      {/* Thêm mẫu câu nhanh */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggle('addPhrase')} 
          className="w-full flex items-center justify-between px-4 py-3 transition hover:bg-[var(--bg-hover)]"
        >
          <div className="flex items-center gap-2">
            {expanded.addPhrase ? (
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            ) : (
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            )}
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Thêm mẫu câu</span>
          </div>
          <Plus className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        </button>
        {expanded.addPhrase && (
          <div className="px-4 pb-3 space-y-2">
            <select
              value={phraseForm.category_id}
              onChange={(e) => setPhraseForm({ ...phraseForm, category_id: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={inputStyle}
            >
              <option value="">Chọn danh mục...</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <input
              type="text"
              value={phraseForm.intent}
              onChange={(e) => setPhraseForm({ ...phraseForm, intent: e.target.value })}
              placeholder="Intent (VD: hoi_gia)"
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={inputStyle}
            />
            <textarea
              value={phraseForm.user_message}
              onChange={(e) => setPhraseForm({ ...phraseForm, user_message: e.target.value })}
              placeholder="Khách hỏi gì?"
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none resize-none"
              style={inputStyle}
              rows={2}
            />
            <textarea
              value={phraseForm.bot_response}
              onChange={(e) => setPhraseForm({ ...phraseForm, bot_response: e.target.value })}
              placeholder="Bot trả lời gì?"
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none resize-none"
              style={inputStyle}
              rows={3}
            />
            <button
              onClick={handleAddPhrase}
              className="w-full px-3 py-2 text-xs font-medium rounded-lg transition"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              Thêm mẫu câu
            </button>
          </div>
        )}
      </div>

      {/* Tin nhắn tự động khi khách im lặng */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggle('idleMessages')} 
          className="w-full flex items-center justify-between px-4 py-3 transition hover:bg-[var(--bg-hover)]"
        >
          <div className="flex items-center gap-2">
            {expanded.idleMessages ? (
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            ) : (
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            )}
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Nhắc khi im lặng</span>
          </div>
          <Toggle checked={idleSettings.enabled} onChange={(v) => onIdleSettingsChange?.({ ...idleSettings, enabled: v })} />
        </button>
        {expanded.idleMessages && idleSettings.enabled && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              AI sẽ tự đọc context cuộc hội thoại và gửi tin nhắn nhắc nhở phù hợp (ưu đãi, đặt lịch...)
            </p>
            
            <div 
              className="p-3 rounded-lg space-y-3"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              {/* Thời gian chờ */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Thời gian chờ giữa các lần nhắc
                </label>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                  <input
                    type="number"
                    value={idleSettings.delaySeconds}
                    onChange={(e) => onIdleSettingsChange?.({ ...idleSettings, delaySeconds: parseInt(e.target.value) || 30 })}
                    className="w-20 px-2 py-1.5 rounded text-sm text-center outline-none"
                    style={inputStyle}
                    min={3}
                    max={300}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>giây</span>
                </div>
              </div>

              {/* Số lần nhắc tối đa */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Số lần nhắc tối đa
                </label>
                <select
                  value={idleSettings.maxReminders}
                  onChange={(e) => onIdleSettingsChange?.({ ...idleSettings, maxReminders: parseInt(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg text-sm outline-none"
                  style={inputStyle}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} lần</option>
                  ))}
                </select>
              </div>

              {/* Danh sách kịch bản/câu nhắc */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Kịch bản / câu nhắc mẫu
                  </label>
                  <button
                    type="button"
                    onClick={addIdleReminderScenario}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    <Plus className="h-3 w-3" /> Thêm
                  </button>
                </div>
                <p className="mb-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  AI sẽ đọc lịch sử chat, chọn kịch bản phù hợp nhất rồi viết lại câu nhắc tự nhiên.
                </p>

                <div className="space-y-2">
                  {idleReminderScenarios.length === 0 && (
                    <div className="rounded-lg border border-dashed px-3 py-3 text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
                      Chưa có kịch bản. Bấm Thêm để tạo câu nhắc mẫu.
                    </div>
                  )}
                  {idleReminderScenarios.map((scenario, index) => (
                    <div key={index} className="rounded-lg p-2.5 space-y-2" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2">
                        <input
                          value={scenario.title}
                          onChange={(e) => updateIdleReminderScenario(index, { title: e.target.value })}
                          placeholder="Tên kịch bản"
                          className="flex-1 px-2 py-1.5 rounded text-xs outline-none"
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => removeIdleReminderScenario(index)}
                          className="rounded p-1.5 hover:bg-red-500/10"
                          style={{ color: '#ef4444' }}
                          title="Xóa kịch bản"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <textarea
                        value={scenario.trigger}
                        onChange={(e) => updateIdleReminderScenario(index, { trigger: e.target.value })}
                        placeholder="Khi nào dùng? VD: Khách hỏi giá niềng răng nhưng chưa đặt lịch..."
                        className="w-full px-2 py-1.5 rounded text-xs outline-none resize-none"
                        style={inputStyle}
                        rows={2}
                      />
                      <textarea
                        value={scenario.message}
                        onChange={(e) => updateIdleReminderScenario(index, { message: e.target.value })}
                        placeholder="Câu nhắc mẫu"
                        className="w-full px-2 py-1.5 rounded text-xs outline-none resize-none"
                        style={inputStyle}
                        rows={2}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-2">
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Thông tin chung thêm
                  </label>
                  <textarea
                    value={idleSettings.context || ''}
                    onChange={(e) => onIdleSettingsChange?.({ ...idleSettings, context: e.target.value })}
                    placeholder="VD: Giảm 20% cho khách mới, hotline: 0909..."
                    className="w-full px-2.5 py-2 rounded-lg text-xs outline-none resize-none"
                    style={inputStyle}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gợi ý tự động */}
      <div style={sectionStyle}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {autoSuggest ? (
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            ) : (
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            )}
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Gợi ý tự động</span>
          </div>
          <Toggle checked={autoSuggest} onChange={onAutoSuggestChange} />
        </div>
        {autoSuggest && (
          <div className="px-4 pb-4">
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              Sau khi trợ lý trả lời sẽ gợi ý 3 câu hỏi tiếp theo
            </p>
            <textarea
              defaultValue={`Considering the AI's character settings, the user's previous chat history with the AI assistant, think about the user's scenario, intention, background in their last inquiry, and generate the questions that the user is most likely to ask the AI assistant (you) next.\n1. Do not generate questions that the user may already know the answer, or unrelated to the current topics.\n2. Always generate very brief and clear questions (less than 15 words) that the user may ask the AI assistant (you), NOT questions that the AI assistant (you) asks the user.\n3. DO NOT generate the same or similar questions.`}
              className="w-full px-3 py-2.5 rounded-lg text-[11px] leading-relaxed font-mono outline-none resize-none transition"
              style={inputStyle}
              rows={10}
            />
          </div>
        )}
      </div>

      {/* Phạm vi segments */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggle('segments')} 
          className="w-full flex items-center justify-between px-4 py-3 transition hover:bg-[var(--bg-hover)]"
        >
          <div className="flex items-center gap-2">
            {expanded.segments ? (
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            ) : (
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            )}
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Phạm vi segments</span>
          </div>
          <span 
            className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {segments}
          </span>
        </button>
        {expanded.segments && (
          <div className="px-4 pb-4">
            <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Số lượng segment nội dung gửi lên trợ lý AI
            </p>
            <select
              value={segments}
              onChange={(e) => onSegmentsChange(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle}
            >
              {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>{n} segment</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
