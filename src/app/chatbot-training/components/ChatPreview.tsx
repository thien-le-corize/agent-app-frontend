'use client';

import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Send, Bot, Loader2, Paperclip, RefreshCw } from 'lucide-react';
import { chatWithBot, getChatSuggestions } from '@/lib/api';

// Regex detect image URLs
const IMAGE_URL_REGEX = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s]*)?)/gi;

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

interface Props {
  promptContent: string;
  model: string;
  autoSuggest?: boolean;
}

export default function ChatPreview({ promptContent, model, autoSuggest = false }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleCountRef = useRef(0);

  // Các tin nhắn tự động khi khách im lặng
  const IDLE_MESSAGES = [
    {
      delay: 30000, // 30 giây
      message: "😊 Anh/chị ơi, em thấy mình đang tìm hiểu về dịch vụ nha khoa. Hiện tại bên em đang có **ưu đãi giảm 20%** cho khách hàng mới đặt lịch trong tuần này. Anh/chị có muốn em tư vấn thêm không ạ?"
    },
    {
      delay: 60000, // 1 phút sau tin đầu
      message: "🎁 Ngoài ra, nếu anh/chị đặt lịch hẹn ngay hôm nay, bên em sẽ **tặng thêm gói kiểm tra răng miệng miễn phí** (trị giá 500.000đ). Anh/chị có muốn em hỗ trợ đặt lịch không ạ?"
    },
    {
      delay: 90000, // 1.5 phút sau
      message: "📅 Em có thể giúp anh/chị đặt lịch hẹn ngay bây giờ. Anh/chị cho em xin:\n- Họ tên\n- Số điện thoại\n- Thời gian mong muốn\n\nĐội ngũ bác sĩ sẽ liên hệ xác nhận ngay ạ! 🦷"
    },
    {
      delay: 120000, // 2 phút sau
      message: "💬 Anh/chị có thắc mắc gì về dịch vụ hay bảng giá không ạ? Em sẵn sàng hỗ trợ 24/7. Hoặc anh/chị có thể để lại số điện thoại để bác sĩ tư vấn trực tiếp nhé!"
    }
  ];

  // Reset idle timer khi có tin nhắn mới
  const resetIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleCountRef.current = 0;
    startIdleTimer();
  };

  // Bắt đầu đếm thời gian idle
  const startIdleTimer = () => {
    if (messages.length === 0) return; // Chỉ chạy khi đã có conversation
    
    const currentIdleIndex = idleCountRef.current;
    if (currentIdleIndex >= IDLE_MESSAGES.length) return; // Đã gửi hết tin idle

    const nextIdle = IDLE_MESSAGES[currentIdleIndex];
    const delay = currentIdleIndex === 0 ? nextIdle.delay : (nextIdle.delay - IDLE_MESSAGES[currentIdleIndex - 1].delay);

    idleTimerRef.current = setTimeout(() => {
      // Thêm tin nhắn tự động từ bot
      setMessages(prev => [...prev, { role: 'assistant', content: nextIdle.message }]);
      idleCountRef.current++;
      startIdleTimer(); // Tiếp tục đếm cho tin tiếp theo
    }, delay);
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
