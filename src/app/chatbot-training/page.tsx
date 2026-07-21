'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Bot,
  MessageSquare,
  Loader2,
  Save,
  Plus,
  X,
  ChevronDown,
} from 'lucide-react';
import {
  getTrainingStats,
  getTrainingCategories,
  getTrainingPhrases,
  getTrainingScenarios,
  getTrainingFAQs,
  seedTrainingData,
  getChatbots,
  createChatbot,
  updateChatbot,
} from '@/lib/api';
import {
  TrainingCategory,
  TrainingPhrase,
  TrainingScenario,
  TrainingFAQ,
  TrainingStats,
} from '@/types';
import PromptEditor, { DEFAULT_AI_RULES } from './components/PromptEditor';
import SettingsPanel from './components/SettingsPanel';
import ChatPreview from './components/ChatPreview';
import KnowledgeModal from './components/KnowledgeModal';
import PromptLibraryModal from './components/PromptLibraryModal';

const DEFAULT_IDLE_SETTINGS = {
  enabled: true,
  delaySeconds: 30,
  maxReminders: 3,
  context: 'Giảm 20% cho khách mới, tặng gói kiểm tra răng miệng miễn phí 500k, hotline: 0909.xxx.xxx',
  reminderScenarios: [
    {
      title: 'Khách hỏi giá nhưng chưa đặt lịch',
      trigger: 'Khách hỏi chi phí, ưu đãi, trả góp hoặc so sánh giá nhưng chưa phản hồi sau khi được tư vấn.',
      message: 'Anh/chị muốn em kiểm tra khung giờ tư vấn miễn phí gần nhất để mình biết rõ chi phí thực tế không ạ?',
    },
    {
      title: 'Khách quan tâm niềng răng',
      trigger: 'Khách hỏi niềng răng, mắc cài, Invisalign, thời gian niềng hoặc có đau không.',
      message: 'Em có thể hỗ trợ mình đặt lịch bác sĩ kiểm tra tình trạng răng để tư vấn phương án niềng phù hợp hơn ạ.',
    },
    {
      title: 'Khách hỏi nhưng chưa chốt thông tin',
      trigger: 'Khách đã hỏi dịch vụ nhưng chưa để lại số điện thoại, chi nhánh hoặc thời gian hẹn.',
      message: 'Anh/chị để lại số điện thoại hoặc thời gian tiện, em hỗ trợ giữ lịch tư vấn cho mình nhé ạ.',
    },
  ],
};

function normalizeIdleSettings(settings?: any) {
  return {
    ...DEFAULT_IDLE_SETTINGS,
    ...(settings || {}),
    reminderScenarios: settings?.reminderScenarios || DEFAULT_IDLE_SETTINGS.reminderScenarios,
  };
}

export default function ChatbotTrainingPage() {
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [phrases, setPhrases] = useState<TrainingPhrase[]>([]);
  const [scenarios, setScenarios] = useState<TrainingScenario[]>([]);
  const [faqs, setFaqs] = useState<TrainingFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Chatbots
  const [chatbots, setChatbots] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [newBotName, setNewBotName] = useState('');

  // Prompt state
  const [promptContent, setPromptContent] = useState(
`## Nhân vật
Bạn là 1 chuyên gia tư vấn niềng răng tại Dr.Wondersmile. Bạn thân thiện, chuyên nghiệp, luôn sẵn sàng hỗ trợ khách hàng.

### Kỹ năng
- Tư vấn tình trạng răng và phương án niềng
- Báo giá các gói niềng răng
- Đặt lịch hẹn thăm khám
- Giải đáp thắc mắc về quy trình niềng

### Xưng hô
- Mặc định xưng hô là anh/chị nếu chưa rõ giới tính
- Khi phù hợp, hỏi nhẹ một lần: "Em nên xưng hô với mình là anh hay chị cho tiện ạ?"
- Không hỏi lặp lại nếu khách đã trả lời hoặc đang cần xử lý yêu cầu chính

### Giới hạn
- Chỉ trả lời những câu hỏi liên quan đến nha khoa và niềng răng
- Giữ kết luận trong khoảng 100 từ
- Cung cấp thông tin chính xác và tin cậy
- Không đưa ra các lời khuyên ngoài phạm vi...`
  );

  // Settings state
  const [model, setModel] = useState('gpt-4o-mini');
  const [debugMode, setDebugMode] = useState(false);
  const [segments, setSegments] = useState(4);
  const [openingQuestions, setOpeningQuestions] = useState<string[]>([
    'Niềng răng mất bao lâu?',
    'Chi phí niềng bao nhiêu?',
    'Có đau không?',
  ]);
  const [autoSuggest, setAutoSuggest] = useState(true);
  const [aiRules, setAiRules] = useState<string[]>(DEFAULT_AI_RULES);

  const [idleSettings, setIdleSettings] = useState(DEFAULT_IDLE_SETTINGS);

  // Modal states
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, categoriesData, phrasesData, scenariosData, faqsData, botsData] = await Promise.all([
        getTrainingStats(),
        getTrainingCategories(),
        getTrainingPhrases(),
        getTrainingScenarios(),
        getTrainingFAQs(),
        getChatbots(),
      ]);
      setStats(statsData);
      setCategories(categoriesData);
      setPhrases(phrasesData);
      setScenarios(scenariosData);
      setFaqs(faqsData);
      setChatbots(botsData);
      if (!selectedBotId && botsData.length > 0) {
        setSelectedBotId(botsData[0].id);
        if (botsData[0].prompt) setPromptContent(botsData[0].prompt);
        if (botsData[0].model) setModel(botsData[0].model);
        if (botsData[0].settings?.auto_suggest) setAutoSuggest(botsData[0].settings.auto_suggest);
        if (botsData[0].settings?.opening_questions) setOpeningQuestions(botsData[0].settings.opening_questions);
        if (botsData[0].settings?.segments) setSegments(botsData[0].settings.segments);
        setAiRules(Array.isArray(botsData[0].settings?.rules) ? botsData[0].settings.rules : DEFAULT_AI_RULES);
        setIdleSettings(normalizeIdleSettings(botsData[0].settings?.idle_settings));
      }
    } catch { toast.error('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  };

  const handleImport = async () => {
    try {
      const result = await seedTrainingData();
      toast.success(`Import: ${result.created.phrases} mẫu câu, ${result.created.scenarios} tình huống, ${result.created.faqs} FAQ`);
      loadData();
    } catch { toast.error('Lỗi import'); }
  };

  const handleCreateBot = async () => {
    if (!newBotName.trim()) return;
    try {
      const bot = await createChatbot({ 
        name: newBotName.trim(), 
        prompt: promptContent, 
        model, 
        settings: { auto_suggest: autoSuggest, segments, opening_questions: openingQuestions, idle_settings: idleSettings, rules: aiRules } 
      });
      toast.success(`Đã tạo chatbot: ${bot.name}`);
      setNewBotName('');
      setShowCreateBot(false);
      setChatbots((prev) => [bot, ...prev]);
      setSelectedBotId(bot.id);
    } catch { toast.error('Lỗi tạo chatbot'); }
  };

  const handleSwitchBot = (botId: string) => {
    const bot = chatbots.find((b) => b.id === botId);
    if (!bot) return;
    setSelectedBotId(botId);
    if (bot.prompt) setPromptContent(bot.prompt);
    if (bot.model) setModel(bot.model);
    setAutoSuggest(bot.settings?.auto_suggest || false);
    setOpeningQuestions(bot.settings?.opening_questions || ['Niềng răng mất bao lâu?', 'Chi phí bao nhiêu?', 'Có đau không?']);
    setSegments(bot.settings?.segments || 4);
    setAiRules(Array.isArray(bot.settings?.rules) ? bot.settings.rules : DEFAULT_AI_RULES);
    setIdleSettings(normalizeIdleSettings(bot.settings?.idle_settings));
  };

  const handleSaveBot = async () => {
    if (!selectedBotId) return;
    try {
      setSaving(true);
      await updateChatbot(selectedBotId, { 
        prompt: promptContent, 
        model, 
        settings: { 
          auto_suggest: autoSuggest, 
          segments, 
          opening_questions: openingQuestions,
          idle_settings: idleSettings,
          rules: aiRules,
        } 
      });
      const savedBot = chatbots.find((bot) => bot.id === selectedBotId);
      if (savedBot) {
        setChatbots((prev) => prev.map((bot) => bot.id === selectedBotId ? {
          ...bot,
          prompt: promptContent,
          model,
          settings: {
            ...(bot.settings || {}),
            auto_suggest: autoSuggest,
            segments,
            opening_questions: openingQuestions,
            idle_settings: idleSettings,
            rules: aiRules,
          },
        } : bot));
      }
      toast.success('Đã lưu chatbot');
    } catch { toast.error('Lỗi lưu'); }
    finally { setSaving(false); }
  };

  const selectedBot = chatbots.find(b => b.id === selectedBotId);
  const promptWithRules = `${promptContent}

## AI RULES
${aiRules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}

## RESPONSE STYLE GUARD
- Không tự nhận mình là chatbot, AI, robot hoặc trợ lý ảo.
- Không lặp lại nguyên văn câu trả lời gần nhất trong lịch sử chat.
- Nếu khách hỏi lại cùng một ý như "bạn là ai" hoặc "bạn có phải chatbot không", hãy trả lời ngắn gọn bằng cách diễn đạt khác và chuyển sang hỏi nhu cầu hỗ trợ cụ thể.
- Luôn đọc lịch sử chat để biết khách đã hỏi/cung cấp thông tin gì rồi mới hỏi tiếp.
- Không kết thúc bằng câu chung chung như "cần thêm thông tin cứ hỏi em", "cần hỗ trợ gì cứ nói em", "anh/chị cần em hỗ trợ thông tin gì" khi lịch sử đã có chủ đề cụ thể.
- Sau khi trả lời ý chính, hỏi đúng 1 câu tiếp theo cụ thể nhất dựa trên thông tin còn thiếu: tình trạng răng, đã thăm khám/chụp phim chưa, chi nhánh, thời gian rảnh, hoặc số điện thoại.`;

  if (loading) {
    return (
      <div 
        className="h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Top Header */}
      <header 
        className="h-14 flex items-center justify-between px-4 shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-4">
          <a href="/chatbot-list" className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent)' }}
            >
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[14px]" style={{ color: 'var(--text-primary)' }}>
              Chatbot Training
            </span>
          </a>

          {/* Bot Selector */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            {chatbots.length > 0 ? (
              <select
                value={selectedBotId}
                onChange={(e) => handleSwitchBot(e.target.value)}
                className="text-[13px] font-medium bg-transparent border-none outline-none cursor-pointer pr-4"
                style={{ color: 'var(--text-primary)' }}
              >
                {chatbots.map((bot) => (
                  <option key={bot.id} value={bot.id}>{bot.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                Chưa có chatbot
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showCreateBot ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newBotName}
                onChange={(e) => setNewBotName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateBot()}
                placeholder="Tên chatbot mới..."
                className="px-3 py-1.5 rounded-lg text-[13px] outline-none w-48"
                style={{ 
                  background: 'var(--bg-primary)', 
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)'
                }}
                autoFocus
              />
              <button 
                onClick={handleCreateBot} 
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                Tạo
              </button>
              <button 
                onClick={() => setShowCreateBot(false)} 
                className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={handleSaveBot} 
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
                style={{ 
                  background: 'var(--bg-elevated)', 
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)'
                }}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Lưu
              </button>
              <button 
                onClick={() => setShowCreateBot(true)} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Chatbot mới
              </button>
              <button 
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold"
                style={{ background: 'var(--accent-green)', color: 'white' }}
              >
                <Bot className="w-3.5 h-3.5" />
                Xuất bản
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Layout: editor | settings | chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Prompt Editor (left panel) */}
        <div 
          className="w-[480px] flex flex-col shrink-0 overflow-hidden"
          style={{ borderRight: '1px solid var(--border)' }}
        >
          <PromptEditor
            content={promptContent}
            onChange={setPromptContent}
            phrases={phrases}
            scenarios={scenarios}
            faqs={faqs}
            categories={categories}
            onImport={handleImport}
            onOpenKnowledge={() => setShowKnowledgeModal(true)}
            onOpenPromptLibrary={() => setShowPromptLibrary(true)}
            rules={aiRules}
            onRulesChange={setAiRules}
          />
        </div>

        {/* Settings Panel (middle) */}
        <div 
          className="w-[380px] flex flex-col shrink-0 overflow-hidden"
          style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
        >
          <SettingsPanel
            model={model}
            onModelChange={setModel}
            debugMode={debugMode}
            onDebugChange={setDebugMode}
            segments={segments}
            onSegmentsChange={setSegments}
            openingQuestions={openingQuestions}
            onOpeningQuestionsChange={setOpeningQuestions}
            autoSuggest={autoSuggest}
            onAutoSuggestChange={setAutoSuggest}
            stats={stats}
            categories={categories}
            onRefresh={loadData}
            onOpenKnowledge={() => setShowKnowledgeModal(true)}
            phrases={phrases}
            faqs={faqs}
            idleSettings={idleSettings}
            onIdleSettingsChange={setIdleSettings}
          />
        </div>

        {/* Chat Preview (right) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatPreview
            promptContent={promptWithRules}
            model={model}
            autoSuggest={autoSuggest}
            idleSettings={idleSettings}
          />
        </div>
      </div>

      {/* Modals */}
      <KnowledgeModal
        open={showKnowledgeModal}
        onClose={() => setShowKnowledgeModal(false)}
        categories={categories}
        stats={stats}
        onRefresh={loadData}
        phrases={phrases}
        faqs={faqs}
        scenarios={scenarios}
      />
      <PromptLibraryModal
        open={showPromptLibrary}
        onClose={() => setShowPromptLibrary(false)}
        onSelect={(content) => setPromptContent(content)}
      />
    </div>
  );
}
