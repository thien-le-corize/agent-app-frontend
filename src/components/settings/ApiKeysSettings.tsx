'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle, KeyRound, Loader2, Save, Trash2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ApiKeysStatus, getApiKeysStatus, updateApiKeys } from '@/lib/api';

const defaultStatus: ApiKeysStatus = {
  openai_api_key: { configured: false, masked: '' },
  gemini_api_key: { configured: false, masked: '' },
};

const providers = [
  {
    id: 'openai_api_key',
    name: 'OpenAI',
    envName: 'OPENAI_API_KEY',
    placeholder: 'sk-...',
    helper: 'Dùng cho tạo ảnh, phân tích reference và chatbot training.',
  },
  {
    id: 'gemini_api_key',
    name: 'Gemini',
    envName: 'GEMINI_API_KEY',
    placeholder: 'AIza...',
    helper: 'Dùng cho tạo video Google Omni/Gemini.',
  },
] as const;

type ProviderId = (typeof providers)[number]['id'];

interface ApiKeysSettingsProps {
  formId?: string;
  showSubmitButton?: boolean;
}

export default function ApiKeysSettings({
  formId = 'api-key-settings-form',
  showSubmitButton = true,
}: ApiKeysSettingsProps) {
  const [status, setStatus] = useState<ApiKeysStatus>(defaultStatus);
  const [values, setValues] = useState<Record<ProviderId, string>>({
    openai_api_key: '',
    gemini_api_key: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setStatus(await getApiKeysStatus());
    } catch (error) {
      toast.error('Không tải được settings API key');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    try {
      const payload: Partial<Record<ProviderId, string>> = {};
      providers.forEach((provider) => {
        const value = values[provider.id].trim();
        if (value) {
          payload[provider.id] = value;
        }
      });

      if (Object.keys(payload).length === 0) {
        toast.error('Nhập ít nhất một API key để lưu');
        return;
      }

      setSaving(true);
      const nextStatus = await updateApiKeys(payload);
      setStatus(nextStatus);
      setValues({ openai_api_key: '', gemini_api_key: '' });
      toast.success('Đã lưu API keys');
    } catch (error: any) {
      const message = error?.response?.data?.message;
      toast.error(Array.isArray(message) ? message[0] : message || 'Không lưu được API keys');
    } finally {
      setSaving(false);
    }
  };

  const clearKey = async (id: ProviderId) => {
    try {
      setSaving(true);
      const nextStatus = await updateApiKeys({ [id]: '' });
      setStatus(nextStatus);
      setValues((current) => ({ ...current, [id]: '' }));
      toast.success('Đã xoá key trong settings');
    } catch (error) {
      toast.error('Không xoá được key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form id={formId} onSubmit={handleSave} className="max-w-5xl">
      <div
        className="overflow-hidden rounded-lg"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <table className="w-full text-left">
          <thead style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th className="px-4 py-3 text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Provider
              </th>
              <th className="px-4 py-3 text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Status
              </th>
              <th className="px-4 py-3 text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                API Key
              </th>
              <th className="px-4 py-3 text-[12px] font-semibold text-right" style={{ color: 'var(--text-secondary)' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => {
              const item = status[provider.id];
              return (
                <tr key={provider.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                      >
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {provider.name}
                        </div>
                        <div className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                          {provider.envName}
                        </div>
                        <div className="text-[12px] mt-2 max-w-[260px]" style={{ color: 'var(--text-secondary)' }}>
                          {provider.helper}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div
                      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px]"
                      style={{
                        background: item.configured ? 'var(--accent-green-muted)' : 'var(--accent-red-muted)',
                        color: item.configured ? 'var(--accent-green)' : 'var(--accent-red)',
                      }}
                    >
                      {item.configured ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {item.configured ? item.masked : 'Chưa cấu hình'}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <input
                      type="password"
                      value={values[provider.id]}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [provider.id]: event.target.value }))
                      }
                      placeholder={provider.placeholder}
                      className="w-full min-w-[260px] px-3 py-2 rounded-lg text-[13px] outline-none"
                      style={{
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                      }}
                      autoComplete="off"
                    />
                  </td>
                  <td className="px-4 py-4 align-top text-right">
                    <button
                      type="button"
                      onClick={() => clearKey(provider.id)}
                      disabled={saving || loading}
                      className="inline-flex items-center justify-center p-2 rounded-lg disabled:opacity-50"
                      style={{
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                      }}
                      title={`Xoá ${provider.name} key trong settings`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          Key lưu trong bảng settings sẽ ưu tiên hơn `.env`. Save chỉ cập nhật các ô có nhập; dùng nút thùng rác để xoá override của từng provider.
        </p>
        {showSubmitButton && (
          <button
            type="submit"
            disabled={saving || loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium disabled:opacity-50"
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: '1px solid var(--accent)',
            }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
        )}
      </div>
    </form>
  );
}
