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
  Facebook,
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
  connectFacebookPage,
  getFacebookOAuthUrl,
  getFacebookOAuthPages,
  connectFacebookOAuthPage,
  syncFacebookProfile,
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
- Mặc định xưng hô là anh/chị nếu chưa rõ giới tính hoặc độ tuổi
- Khi phù hợp, hỏi nhẹ một lần: "Em nên xưng hô với mình là anh/chị hay gọi em cho tiện ạ?"
- Nếu khách tự xưng hoặc cho biết tuổi nhỏ hơn, giữ cách gọi đó trong các tin nhắn sau
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
  const [showFacebookModal, setShowFacebookModal] = useState(false);
  const [connectingFacebook, setConnectingFacebook] = useState(false);
  const [manualFacebookSetup, setManualFacebookSetup] = useState(false);
  const [facebookOAuthPages, setFacebookOAuthPages] = useState<Array<{ id: string; name: string; tasks?: string[] }>>([]);
  const [facebookForm, setFacebookForm] = useState({
    page_id: '',
    page_name: '',
    page_access_token: '',
    verify_token: '',
    app_secret: '',
  });

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
        const query = new URLSearchParams(window.location.search);
        const queryBotId = query.get('bot');
        const initialBot = botsData.find((bot) => bot.id === queryBotId) || botsData[0];
        applySelectedBot(initialBot);
        if (query.get('facebook') === 'select_page') {
          setShowFacebookModal(true);
          setManualFacebookSetup(false);
          loadFacebookOAuthPages(initialBot.id);
        }
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
    applySelectedBot(bot);
  };

  const applySelectedBot = (bot: any) => {
    setSelectedBotId(bot.id);
    if (bot.prompt) setPromptContent(bot.prompt);
    if (bot.model) setModel(bot.model);
    setAutoSuggest(bot.settings?.auto_suggest || false);
    setOpeningQuestions(bot.settings?.opening_questions || ['Niềng răng mất bao lâu?', 'Chi phí bao nhiêu?', 'Có đau không?']);
    setSegments(bot.settings?.segments || 4);
    setAiRules(Array.isArray(bot.settings?.rules) ? bot.settings.rules : DEFAULT_AI_RULES);
    setIdleSettings(normalizeIdleSettings(bot.settings?.idle_settings));
  };

  const openFacebookModal = () => {
    if (!selectedBotId) {
      toast.error('Chọn chatbot trước khi kết nối fanpage');
      return;
    }
    const facebook = selectedBot?.settings?.facebook || {};
    setFacebookForm({
      page_id: facebook.page_id || '',
      page_name: facebook.page_name || '',
      page_access_token: facebook.page_access_token || '',
      verify_token: facebook.verify_token || '',
      app_secret: facebook.app_secret || '',
    });
    setManualFacebookSetup(false);
    loadFacebookOAuthPages(selectedBotId);
    setShowFacebookModal(true);
  };

  const loadFacebookOAuthPages = async (botId: string) => {
    try {
      const { pages } = await getFacebookOAuthPages(botId);
      setFacebookOAuthPages(pages);
    } catch {
      setFacebookOAuthPages([]);
    }
  };

  const handleFacebookOAuth = async () => {
    if (!selectedBotId) {
      toast.error('Chọn chatbot trước khi kết nối fanpage');
      return;
    }

    try {
      setConnectingFacebook(true);
      const returnUrl = `${window.location.origin}/chatbot-training?bot=${selectedBotId}`;
      const { url } = await getFacebookOAuthUrl(selectedBotId, returnUrl);
      window.location.href = url;
    } catch {
      toast.error('Không thể mở Facebook Login. Kiểm tra FACEBOOK_APP_ID/SECRET và URL callback.');
      setConnectingFacebook(false);
    }
  };

  const handleConnectFacebook = async () => {
    if (!selectedBotId) return;
    if (!facebookForm.page_id.trim() || !facebookForm.page_access_token.trim() || !facebookForm.verify_token.trim()) {
      toast.error('Nhập Page ID, Page Access Token và Verify Token');
      return;
    }

    try {
      setConnectingFacebook(true);
      const updatedBot = await connectFacebookPage(selectedBotId, {
        page_id: facebookForm.page_id.trim(),
        page_name: facebookForm.page_name.trim(),
        page_access_token: facebookForm.page_access_token.trim(),
        verify_token: facebookForm.verify_token.trim(),
        app_secret: facebookForm.app_secret.trim(),
      });
      setChatbots((prev) => prev.map((bot) => bot.id === selectedBotId ? updatedBot : bot));
      setShowFacebookModal(false);
      toast.success('Đã lưu kết nối fanpage');
    } catch {
      toast.error('Không thể lưu kết nối fanpage');
    } finally {
      setConnectingFacebook(false);
    }
  };

  const handleSelectFacebookPage = async (pageId: string) => {
    if (!selectedBotId) return;
    try {
      setConnectingFacebook(true);
      const updatedBot = await connectFacebookOAuthPage(selectedBotId, pageId);
      setChatbots((prev) => prev.map((bot) => bot.id === selectedBotId ? updatedBot : bot));
      setFacebookOAuthPages([]);
      setShowFacebookModal(false);
      toast.success(`Đã kết nối fanpage ${updatedBot.settings?.facebook?.page_name || ''}`.trim());
    } catch {
      toast.error('Không thể kết nối fanpage này');
    } finally {
      setConnectingFacebook(false);
    }
  };

  const handleSyncFacebookProfile = async () => {
    if (!selectedBotId) return;
    try {
      setConnectingFacebook(true);
      await syncFacebookProfile(selectedBotId);
      toast.success('Đã đồng bộ mẫu tin nhắn nhanh lên fanpage');
    } catch {
      toast.error('Không thể đồng bộ mẫu tin nhắn nhanh');
    } finally {
      setConnectingFacebook(false);
    }
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
  const facebookWebhookUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/chatbot-training/facebook/webhook`;
  const promptWithRules = `${promptContent}

## AI RULES
${aiRules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}

## RESPONSE STYLE GUARD
- Không tự nhận mình là chatbot, AI, robot hoặc trợ lý ảo.
- Không lặp lại nguyên văn câu trả lời gần nhất trong lịch sử chat.
- Nếu khách hỏi lại cùng một ý như "bạn là ai" hoặc "bạn có phải chatbot không", hãy trả lời ngắn gọn bằng cách diễn đạt khác và chuyển sang hỏi nhu cầu hỗ trợ cụ thể.
- Nếu chưa rõ cách xưng hô, có thể hỏi một lần: "Em nên xưng hô với mình là anh/chị hay gọi em cho tiện ạ?". Không hỏi lại nếu khách đã trả lời.
- Nếu khách tự xưng hoặc cho biết tuổi nhỏ hơn, giữ cách gọi phù hợp trong các tin nhắn sau.
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
                onClick={openFacebookModal}
                disabled={!selectedBotId}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
                style={{
                  background: selectedBot?.settings?.facebook?.status === 'connected' ? 'var(--accent-blue-muted)' : 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: selectedBot?.settings?.facebook?.status === 'connected' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                }}
              >
                <Facebook className="w-3.5 h-3.5" />
                {selectedBot?.settings?.facebook?.status === 'connected' ? 'Đã kết nối fanpage' : 'Kết nối fanpage'}
              </button>
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
      {showFacebookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowFacebookModal(false)} />
          <div
            className="relative w-full max-w-lg mx-4 rounded-xl p-6"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-blue)' }}>
                  <Facebook className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Kết nối fanpage
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {selectedBot?.name || 'Chatbot'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFacebookModal(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Kết nối trực tiếp
                </label>
                <button
                  onClick={handleFacebookOAuth}
                  disabled={connectingFacebook}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold disabled:opacity-50"
                  style={{ background: '#1877f2', color: 'white' }}
                >
                  {connectingFacebook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Facebook className="w-4 h-4" />}
                  Đăng nhập Facebook và chọn fanpage
                </button>
              </div>

              {facebookOAuthPages.length > 0 && (
                <div className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="text-[12px] font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                    Chọn fanpage để gắn với chatbot này
                  </div>
                  <div className="space-y-2">
                    {facebookOAuthPages.map((page) => (
                      <button
                        key={page.id}
                        onClick={() => handleSelectFacebookPage(page.id)}
                        disabled={connectingFacebook}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left disabled:opacity-50"
                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
                      >
                        <div>
                          <div className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                            {page.name}
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                            Page ID: {page.id}
                          </div>
                        </div>
                        <span className="text-[12px] font-medium" style={{ color: 'var(--accent-blue)' }}>
                          Kết nối
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedBot?.settings?.facebook?.status === 'connected' && (
                <div className="rounded-lg p-3" style={{ background: 'var(--accent-blue-muted)', border: '1px solid var(--border)' }}>
                  <div className="text-[12px] mb-3" style={{ color: 'var(--text-primary)' }}>
                    Fanpage đã kết nối: {selectedBot.settings.facebook.page_name || selectedBot.settings.facebook.page_id}
                  </div>
                  <button
                    onClick={handleSyncFacebookProfile}
                    disabled={connectingFacebook}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium disabled:opacity-50"
                    style={{ background: 'var(--accent-blue)', color: 'white' }}
                  >
                    {connectingFacebook && <Loader2 className="w-4 h-4 animate-spin" />}
                    Đồng bộ mẫu tin nhắn nhanh
                  </button>
                </div>
              )}

              <button
                onClick={() => setManualFacebookSetup((prev) => !prev)}
                className="text-[12px] underline"
                style={{ color: 'var(--text-secondary)' }}
              >
                {manualFacebookSetup ? 'Ẩn cấu hình thủ công' : 'Cấu hình thủ công bằng token'}
              </button>

              {manualFacebookSetup && (
                <>
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      Tên fanpage
                    </label>
                    <input
                      value={facebookForm.page_name}
                      onChange={(e) => setFacebookForm((prev) => ({ ...prev, page_name: e.target.value }))}
                      placeholder="VD: Dr.Wondersmile"
                      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Page ID
                </label>
                <input
                  value={facebookForm.page_id}
                  onChange={(e) => setFacebookForm((prev) => ({ ...prev, page_id: e.target.value }))}
                  placeholder="Nhập Facebook Page ID"
                  className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Page Access Token
                </label>
                <input
                  type="password"
                  value={facebookForm.page_access_token}
                  onChange={(e) => setFacebookForm((prev) => ({ ...prev, page_access_token: e.target.value }))}
                  placeholder="EAAB..."
                  className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Verify Token
                </label>
                <input
                  value={facebookForm.verify_token}
                  onChange={(e) => setFacebookForm((prev) => ({ ...prev, verify_token: e.target.value }))}
                  placeholder="Chuỗi tự đặt để verify webhook"
                  className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  App Secret
                </label>
                <input
                  type="password"
                  value={facebookForm.app_secret}
                  onChange={(e) => setFacebookForm((prev) => ({ ...prev, app_secret: e.target.value }))}
                  placeholder="Tùy chọn, dùng để verify chữ ký webhook"
                  className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
                </>
              )}

              <div className="rounded-lg p-3 text-[12px]" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                <div className="mb-2">Webhook URL dùng trong Facebook Developer:</div>
                <div className="break-all font-mono" style={{ color: 'var(--text-primary)' }}>
                  {facebookWebhookUrl}
                </div>
                <div className="mt-2">Verify Token phải trùng với token bạn nhập ở form này.</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowFacebookModal(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[var(--bg-hover)]"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Hủy
              </button>
              {manualFacebookSetup && (
                <button
                  onClick={handleConnectFacebook}
                  disabled={connectingFacebook}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
                  style={{ background: 'var(--accent-blue)', color: 'white' }}
                >
                  {connectingFacebook && <Loader2 className="w-4 h-4 animate-spin" />}
                  Lưu thủ công
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
