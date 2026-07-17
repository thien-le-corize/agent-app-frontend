'use client';

import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Send, Bot, Loader2, Paperclip, RefreshCw } from 'lucide-react';
import { chatWithBot, getChatSuggestions } from '@/lib/api';

// Regex detect image URLs
const IMAGE_URL_REGEX = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s]*)?)/gi;

export interface IdleSettings {
  enabled: boolean;
  delaySeconds: number;
  maxReminders: number;
  context: string;
  reminderScenarios?: {
    title: string;
    trigger: string;
    message: string;
  }[];
}

function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  const imageUrls = content.match(IMAGE_URL_REGEX);

  if (!imageUrls || imageUrls.length === 0) {
    return <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>;
  }

  const parts: { type: 'text' | 'image'; value: string }[] = [];
  let remaining = content;

  imageUrls.forEach((url) => {
    const idx = remaining.indexOf(url);
    if (idx > 0) {
      parts.push({ type: 'text', value: remaining.slice(0, idx).trim() });
    }
    parts.push({ type: 'image', value: url });
    remaining = remaining.slice(idx + url.length);
  });
  if (remaining.trim()) {
    parts.push({ type: 'text', value: remaining.trim() });
  }

  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.type === 'image') {
          return (
            <div key={i} className="rounded-lg overflow-hidden">
              <img
                src={part.value}
                alt="Hình ảnh tham khảo"
                className="w-full max-w-[280px] h-auto rounded-lg"
                style={{ border: '1px solid var(--border)' }}
                loading="lazy"
              />
            </div>
          );
        }
        return (
          <p key={i} className="text-sm whitespace-pre-wrap leading-relaxed">
            {part.value}
          </p>
        );
      })}
    </div>
  );
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IdleMessageConfig {
  delay: number; // seconds
  message: string;
}

interface Props {
  promptContent: string;
  model: string;
  autoSuggest?: boolean;
  idleSettings?: IdleSettings;
}

export default function ChatPreview({ promptContent, model, autoSuggest = false, idleSettings }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleCountRef = useRef(0);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Default idle settings
  const defaultIdleSettings: IdleSettings = { enabled: true, delaySeconds: 30, maxReminders: 3, context: '', reminderScenarios: [] };
  const currentIdleSettings = idleSettings || defaultIdleSettings;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const normalizeForCompare = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9à-ỹđ\s]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  const getTextSimilarity = (a: string, b: string) => {
    const aTokens = new Set(normalizeForCompare(a).split(' ').filter(Boolean));
    const bTokens = new Set(normalizeForCompare(b).split(' ').filter(Boolean));
    if (aTokens.size === 0 || bTokens.size === 0) return 0;
    const intersection = Array.from(aTokens).filter((token) => bTokens.has(token)).length;
    const union = new Set(Array.from(aTokens).concat(Array.from(bTokens))).size;
    return intersection / union;
  };

  const enforceNeutralAddress = (text: string) =>
    text.replace(/(^|[\s(["“])anh(?=[\s,.!?)]|$)/gi, (match, prefix) => `${prefix}${match.trim()[0] === 'A' ? 'Anh/chị' : 'anh/chị'}`)
      .replace(/(^|[\s(["“])chị(?=[\s,.!?)]|$)/gi, (match, prefix) => `${prefix}${match.trim()[0] === 'C' ? 'Anh/chị' : 'anh/chị'}`);

  const pickFallbackReminder = (reminderCount: number, previousMessages: string[]) => {
    const fallbacks = [
      '😊 Anh/chị ơi, em vẫn ở đây để hỗ trợ mình tư vấn thêm về dịch vụ nha khoa ạ.',
      '📅 Anh/chị muốn em kiểm tra giúp khung giờ tư vấn hoặc thăm khám gần nhất không ạ?',
      '💬 Nếu anh/chị cần thêm thông tin, mình cứ nhắn lại, em sẽ hỗ trợ tiếp ngay ạ.',
      '☎️ Anh/chị có thể để lại số điện thoại hoặc thời gian tiện, em hỗ trợ kết nối tư vấn cho mình ạ.',
      '✨ Em có thể tóm tắt lại phương án phù hợp để anh/chị dễ quyết định hơn không ạ?',
    ];
    const previous = new Set(previousMessages.map(normalizeForCompare));
    return fallbacks.find((message) => !previous.has(normalizeForCompare(message)))
      || fallbacks[(reminderCount - 1) % fallbacks.length];
  };

  const makeReminderUnique = (message: string, reminderCount: number, previousMessages: string[]) => {
    const cleaned = enforceNeutralAddress(message.trim());
    const normalized = normalizeForCompare(cleaned);
    const isDuplicate = previousMessages.some((previous) =>
      normalizeForCompare(previous) === normalized || getTextSimilarity(previous, cleaned) >= 0.72
    );
    return isDuplicate ? pickFallbackReminder(reminderCount, previousMessages) : cleaned;
  };

  // Generate tin nhắn nhắc bằng AI dựa trên context
  const generateIdleReminder = async (reminderCount: number): Promise<string> => {
    const currentMessages = messagesRef.current;
    const history = currentMessages.map((m) => ({ role: m.role, content: m.content }));
    const previousAssistantMessages = currentMessages
      .filter((m) => m.role === 'assistant')
      .map((m) => m.content);
    const scenarioList = (currentIdleSettings.reminderScenarios || [])
      .filter((scenario) => scenario.title?.trim() || scenario.trigger?.trim() || scenario.message?.trim())
      .map((scenario, index) => `${index + 1}. Kịch bản: ${scenario.title || 'Không tên'}
Điều kiện dùng: ${scenario.trigger || 'Không có'}
Câu nhắc mẫu: ${scenario.message || 'Không có'}`)
      .join('\n\n');
    
    // Tạo prompt để AI generate tin nhắn nhắc
    const reminderPrompt = `[HỆ THỐNG: Khách hàng đã im lặng. Đây là lần nhắc thứ ${reminderCount}/${currentIdleSettings.maxReminders}. 
Hãy đọc lịch sử cuộc trò chuyện, xác định nhu cầu/ý định hiện tại của khách, rồi chọn kịch bản nhắc phù hợp nhất.
Nếu có kịch bản mẫu bên dưới, ưu tiên dùng đúng ý của kịch bản phù hợp và viết lại thành một tin nhắn tự nhiên.
Nếu không có kịch bản phù hợp, hãy gửi tin nhắn nhắc ngắn gọn, thân thiện theo thứ tự:
- Lần 1: Hỏi thăm và gợi mở hỗ trợ tiếp
- Lần 2: Đề nghị hỗ trợ đặt lịch hoặc tư vấn cụ thể
- Lần 3+: Để lại thông tin liên hệ nhẹ nhàng

${currentIdleSettings.context ? `Thông tin ưu đãi/liên hệ: ${currentIdleSettings.context}` : ''}
${scenarioList ? `Danh sách kịch bản/câu nhắc mẫu:\n${scenarioList}` : ''}
${previousAssistantMessages.length ? `Các tin nhắn bot đã gửi, tuyệt đối không lặp lại nội dung tương tự:\n${previousAssistantMessages.map((message, index) => `${index + 1}. ${message}`).join('\n')}` : ''}

Yêu cầu:
- Chỉ trả lời một tin nhắn nhắc gửi cho khách, không giải thích cách chọn.
- Không nhắc rằng khách "im lặng" theo cách gây áp lực.
- Giữ giọng tư vấn nha khoa chuyên nghiệp, thân thiện, ngắn gọn.
- Xưng hô nhất quán bằng "anh/chị". Không dùng riêng "anh" hoặc riêng "chị".
- Không lặp lại y nguyên hoặc gần giống câu đã gửi trước đó trong lịch sử.]`;
    
    try {
      const { reply } = await chatWithBot({ message: reminderPrompt, history });
      return makeReminderUnique(reply, reminderCount, previousAssistantMessages);
    } catch {
      return pickFallbackReminder(reminderCount, previousAssistantMessages);
    }
  };

  // Reset idle timer khi có tin nhắn mới
  const resetIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleCountRef.current = 0;
    if (currentIdleSettings.enabled) {
      startIdleTimer();
    }
  };

  // Bắt đầu đếm thời gian idle
  const startIdleTimer = () => {
    if (!currentIdleSettings.enabled) return;
    if (messages.length === 0) return;
    
    const currentIdleIndex = idleCountRef.current;
    if (currentIdleIndex >= currentIdleSettings.maxReminders) return;

    idleTimerRef.current = setTimeout(async () => {
      idleCountRef.current++;
      const reminderMessage = await generateIdleReminder(idleCountRef.current);
      setMessages(prev => {
        const next = [...prev, { role: 'assistant' as const, content: reminderMessage }];
        messagesRef.current = next;
        return next;
      });
      startIdleTimer();
    }, currentIdleSettings.delaySeconds * 1000);
  };

  // Cleanup timer khi unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  // Start idle timer khi có tin nhắn mới
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'user') {
        resetIdleTimer();
      }
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, suggestions]);

  const fetchSuggestions = async (history: ChatMessage[]) => {
    if (!autoSuggest || history.length === 0) return;
    setLoadingSuggestions(true);
    try {
      const { suggestions: newSuggestions } = await getChatSuggestions(
        history.map((m) => ({ role: m.role, content: m.content }))
      );
      setSuggestions(newSuggestions);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSend = async (msg?: string) => {
    const text = (msg || input).trim();
    if (!text || loading) return;

    // Reset idle timer khi user gửi tin
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleCountRef.current = 0;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setSuggestions([]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const { reply } = await chatWithBot({ message: text, history });
      const updatedMessages = [...newMessages, { role: 'assistant' as const, content: reply }];
      setMessages(updatedMessages);

      if (autoSuggest) {
        fetchSuggestions(updatedMessages);
      }
    } catch {
      toast.error('Bot không phản hồi');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleClearChat = () => {
    setMessages([]);
    setSuggestions([]);
    // Reset idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleCountRef.current = 0;
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Chat header */}
      <div 
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <Bot className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Chat Preview
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Test chatbot của bạn
            </p>
          </div>
        </div>
        <button 
          onClick={handleClearChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <Bot className="w-8 h-8" style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Bắt đầu cuộc trò chuyện
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Gửi tin nhắn để test chatbot
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
              }`}
              style={{
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-surface)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
              }}
            >
              <MessageContent content={msg.content} isUser={msg.role === 'user'} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div 
              className="rounded-2xl rounded-bl-md px-4 py-3"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: 'var(--text-tertiary)', animationDelay: '0ms' }}
                />
                <div 
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: 'var(--text-tertiary)', animationDelay: '150ms' }}
                />
                <div 
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: 'var(--text-tertiary)', animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Auto Suggestions */}
        {!loading && suggestions.length > 0 && (
          <div className="flex flex-col gap-2 pt-1 pl-9">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="flex items-center justify-between w-full text-left px-4 py-3 rounded-xl text-sm transition"
                style={{ 
                  background: 'var(--bg-surface)', 
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)'
                }}
              >
                <span>{s}</span>
                <span style={{ color: 'var(--text-tertiary)' }} className="ml-3 shrink-0">→</span>
              </button>
            ))}
          </div>
        )}

        {loadingSuggestions && (
          <div className="flex items-center gap-2 pt-2 pl-9">
            <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Đang tạo gợi ý...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <button 
            className="p-2 transition hover:bg-[var(--bg-hover)] rounded-lg"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Gửi tin nhắn..."
            className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none transition"
            style={{ 
              background: 'var(--bg-surface)', 
              border: '1px solid var(--border)',
              color: 'var(--text-primary)'
            }}
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
