'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, Facebook, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  connectFacebookOAuthPage,
  connectFacebookPage,
  createChatbot,
  getChatbots,
  getFacebookOAuthPages,
  getFacebookOAuthUrl,
  syncFacebookProfile,
  updateChatbot,
} from '@/lib/api';

interface FacebookForm {
  page_id: string;
  page_name: string;
  page_access_token: string;
  verify_token: string;
  app_secret: string;
}

const emptyForm: FacebookForm = {
  page_id: '',
  page_name: '',
  page_access_token: '',
  verify_token: '',
  app_secret: '',
};

export default function FanpageSettings() {
  const [chatbots, setChatbots] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState('');
  const [oauthPages, setOauthPages] = useState<Array<{ id: string; name: string; tasks?: string[] }>>([]);
  const [form, setForm] = useState<FacebookForm>(emptyForm);
  const [newBotName, setNewBotName] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const selectedBot = useMemo(
    () => chatbots.find((bot) => bot.id === selectedBotId) || null,
    [chatbots, selectedBotId],
  );
  const connectedFacebook = selectedBot?.settings?.facebook;

  useEffect(() => {
    loadChatbots();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pendingBotId = localStorage.getItem('settings_facebook_bot_id');
    if (pendingBotId && params.get('facebook') === 'select_page') {
      setSelectedBotId(pendingBotId);
      loadOAuthPages(pendingBotId);
    }
  }, []);

  useEffect(() => {
    const facebook = selectedBot?.settings?.facebook || {};
    setForm({
      page_id: facebook.page_id || '',
      page_name: facebook.page_name || '',
      page_access_token: facebook.page_access_token || '',
      verify_token: facebook.verify_token || '',
      app_secret: facebook.app_secret || '',
    });
  }, [selectedBot]);

  const loadChatbots = async () => {
    try {
      setLoading(true);
      const bots = await getChatbots();
      setChatbots(bots);
      setSelectedBotId((current) => current || bots[0]?.id || '');
    } catch {
      toast.error('Không tải được danh sách chatbot/fanpage');
    } finally {
      setLoading(false);
    }
  };

  const loadOAuthPages = async (botId: string) => {
    try {
      const { pages } = await getFacebookOAuthPages(botId);
      setOauthPages(pages);
    } catch {
      setOauthPages([]);
    }
  };

  const handleCreateBot = async () => {
    const name = newBotName.trim();
    if (!name) {
      toast.error('Nhập tên chatbot để gắn fanpage');
      return;
    }
    try {
      setWorking(true);
      const bot = await createChatbot({ name, description: 'Chatbot dùng để quản lý fanpage' });
      setChatbots((prev) => [bot, ...prev]);
      setSelectedBotId(bot.id);
      setNewBotName('');
      toast.success('Đã tạo chatbot');
    } catch {
      toast.error('Không tạo được chatbot');
    } finally {
      setWorking(false);
    }
  };

  const handleFacebookOAuth = async () => {
    if (!selectedBotId) {
      toast.error('Chọn hoặc tạo chatbot trước');
      return;
    }
    try {
      setWorking(true);
      localStorage.setItem('settings_facebook_bot_id', selectedBotId);
      const returnUrl = `${window.location.origin}/?tab=settings`;
      const { url } = await getFacebookOAuthUrl(selectedBotId, returnUrl);
      window.location.href = url;
    } catch {
      toast.error('Không mở được Facebook Login');
      setWorking(false);
    }
  };

  const handleSelectOAuthPage = async (pageId: string) => {
    if (!selectedBotId) return;
    try {
      setWorking(true);
      const updatedBot = await connectFacebookOAuthPage(selectedBotId, pageId);
      setChatbots((prev) => prev.map((bot) => bot.id === selectedBotId ? updatedBot : bot));
      setOauthPages([]);
      localStorage.removeItem('settings_facebook_bot_id');
      toast.success(`Đã kết nối ${updatedBot.settings?.facebook?.page_name || 'fanpage'}`);
    } catch {
      toast.error('Không kết nối được fanpage này');
    } finally {
      setWorking(false);
    }
  };

  const handleManualSave = async () => {
    if (!selectedBotId) return;
    if (!form.page_id.trim() || !form.page_access_token.trim() || !form.verify_token.trim()) {
      toast.error('Nhập Page ID, Page Access Token và Verify Token');
      return;
    }
    try {
      setWorking(true);
      const updatedBot = await connectFacebookPage(selectedBotId, {
        page_id: form.page_id.trim(),
        page_name: form.page_name.trim(),
        page_access_token: form.page_access_token.trim(),
        verify_token: form.verify_token.trim(),
        app_secret: form.app_secret.trim(),
      });
      setChatbots((prev) => prev.map((bot) => bot.id === selectedBotId ? updatedBot : bot));
      toast.success('Đã lưu kết nối fanpage');
    } catch {
      toast.error('Không lưu được kết nối fanpage');
    } finally {
      setWorking(false);
    }
  };

  const handleDisconnect = async () => {
    if (!selectedBotId || !selectedBot) return;
    const pageName = connectedFacebook?.page_name || connectedFacebook?.page_id || 'fanpage';
    if (!confirm(`Gỡ kết nối ${pageName}?`)) return;
    try {
      setWorking(true);
      const nextSettings = { ...(selectedBot.settings || {}) };
      delete nextSettings.facebook;
      delete nextSettings.facebook_oauth_pages;
      const updatedBot = await updateChatbot(selectedBotId, { settings: nextSettings });
      setChatbots((prev) => prev.map((bot) => bot.id === selectedBotId ? updatedBot : bot));
      setForm(emptyForm);
      toast.success('Đã gỡ kết nối fanpage');
    } catch {
      toast.error('Không gỡ được fanpage');
    } finally {
      setWorking(false);
    }
  };

  const handleSync = async () => {
    if (!selectedBotId) return;
    try {
      setWorking(true);
      await syncFacebookProfile(selectedBotId);
      toast.success('Đã đồng bộ fanpage');
    } catch {
      toast.error('Không đồng bộ được fanpage');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="max-w-5xl rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: '#1877f2' }}>
            <Facebook className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Fanpage Facebook</h3>
            <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>Quản lý fanpage dùng cho Workflow đăng bài và chatbot.</p>
          </div>
        </div>
        <button
          onClick={loadChatbots}
          disabled={loading || working}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium disabled:opacity-50"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Tải lại
        </button>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <label className="block text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>Chatbot chứa fanpage</label>
          <select
            value={selectedBotId}
            onChange={(event) => setSelectedBotId(event.target.value)}
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            {chatbots.length === 0 ? <option value="">Chưa có chatbot</option> : null}
            {chatbots.map((bot) => (
              <option key={bot.id} value={bot.id}>{bot.name}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              value={newBotName}
              onChange={(event) => setNewBotName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCreateBot();
              }}
              placeholder="Tên chatbot mới"
              className="min-w-0 flex-1 rounded-lg px-3 py-2 text-[12px] outline-none"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
            <button
              onClick={handleCreateBot}
              disabled={working || !newBotName.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
              title="Tạo chatbot"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleFacebookOAuth}
            disabled={working || !selectedBotId}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
            style={{ background: '#1877f2' }}
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
            Đăng nhập Facebook
          </button>
        </div>

        <div className="space-y-4">
          {connectedFacebook?.status === 'connected' ? (
            <div className="rounded-lg p-4" style={{ background: 'var(--accent-blue-muted)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Fanpage đang kết nối</p>
                  <p className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {connectedFacebook.page_name || connectedFacebook.page_id}
                  </p>
                  <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Page ID: {connectedFacebook.page_id}</p>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={working}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium disabled:opacity-50"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.24)' }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Gỡ kết nối
                </button>
              </div>
              <button
                onClick={handleSync}
                disabled={working}
                className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--accent-blue)' }}
              >
                {working && <Loader2 className="h-4 w-4 animate-spin" />}
                Đồng bộ mẫu tin nhắn nhanh
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <Bot className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Chatbot này chưa kết nối fanpage.</p>
            </div>
          )}

          {oauthPages.length > 0 && (
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <p className="mb-3 text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>Chọn fanpage để kết nối</p>
              <div className="space-y-2">
                {oauthPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => handleSelectOAuthPage(page.id)}
                    disabled={working}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left disabled:opacity-50"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
                  >
                    <span>
                      <span className="block text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{page.name}</span>
                      <span className="mt-0.5 block text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Page ID: {page.id}</span>
                    </span>
                    <span className="text-[12px] font-medium" style={{ color: 'var(--accent-blue)' }}>Kết nối</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setManualOpen((prev) => !prev)}
            className="text-[12px] underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            {manualOpen ? 'Ẩn cấu hình thủ công' : 'Cấu hình thủ công bằng token'}
          </button>

          {manualOpen && (
            <div className="grid gap-3 rounded-lg p-3 md:grid-cols-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              {[
                ['page_name', 'Tên fanpage', 'VD: Dr.Wondersmile'],
                ['page_id', 'Page ID', 'Nhập Facebook Page ID'],
                ['page_access_token', 'Page Access Token', 'EAAB...'],
                ['verify_token', 'Verify Token', 'Chuỗi tự đặt'],
                ['app_secret', 'App Secret', 'Tùy chọn'],
              ].map(([key, label, placeholder]) => (
                <label key={key} className="space-y-1">
                  <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
                  <input
                    type={key.includes('token') || key.includes('secret') ? 'password' : 'text'}
                    value={(form as any)[key]}
                    onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  />
                </label>
              ))}
              <div className="md:col-span-2">
                <button
                  onClick={handleManualSave}
                  disabled={working || !selectedBotId}
                  className="rounded-lg px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
                  style={{ background: 'var(--accent-blue)' }}
                >
                  Lưu kết nối thủ công
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
