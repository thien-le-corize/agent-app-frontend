'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Bot,
  Users,
  Calendar,
  TrendingUp,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { AppShell, Header } from '@/components/layout';
import { MetricCard, StatusIndicator, DataTable, Column, ActionBadge } from '@/components/dashboard';
import ApiKeysSettings from '@/components/settings/ApiKeysSettings';
import FanpageSettings from '@/components/settings/FanpageSettings';

// Mock data for demo - replace with actual API calls
const mockStats = {
  totalPrompts: 124000,
  avgLatency: 850,
  totalCost: 452.16,
  activeModels: 3,
  promptsTrend: 15,
  latencyTrend: -5,
  costTrend: -8,
};

const mockModels = [
  { name: 'GPT-4o', status: 'healthy', traffic: 68, latency: 120, requests: '84k' },
  { name: 'Claude 3.5 Sonnet', status: 'healthy', traffic: 22, latency: 145, requests: '27k' },
  { name: 'Gemini Flash', status: 'warning', traffic: 10, latency: 850, requests: '13k' },
];

const mockExceptions = [
  { time: '10:42 AM', clientId: 'user_892x', violation: 'PII_Detector_v2 (Credit Card Info)', snippet: '"payment with 4532 1121"', action: 'blocked' as const },
  { time: '10:15 AM', clientId: 'user_110a', violation: 'Prompt Injection Attempt', snippet: '"Ignore previous instructions"', action: 'fallback' as const },
  { time: '09:30 AM', clientId: 'sys_router', violation: 'Upstream Timeout (GPT-4o > 5000ms)', snippet: '"Summarize the attached 50..."', action: 'blocked' as const },
  { time: '09:12 AM', clientId: 'user_4480', violation: 'Output Parsing: Invalid JSON Schema', snippet: '"{user_name: \'John Doe\'}"', action: 'retried' as const },
  { time: '08:45 AM', clientId: 'api_v2', violation: 'Rate Limit: 60 requests/minute', snippet: '"What is the capital of F..."', action: 'blocked' as const },
];

// Flow diagram component
function FlowDiagram() {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Endpoint Traffic & Health
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            Last Updated: {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            View Details
          </button>
        </div>
      </div>

      {/* Flow visualization */}
      <div className="relative py-8">
        {/* API Gateway - Center top */}
        <div className="flex justify-center mb-8">
          <div
            className="px-5 py-3 rounded-xl text-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2 justify-center mb-1">
              <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                API Gateway
              </span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              v1/chat/completions
            </p>
            <p className="text-[12px] font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
              124k Reqs
            </p>
          </div>
        </div>

        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          {/* Lines from gateway to models */}
          <path d="M 50% 100 L 20% 200" stroke="url(#lineGradient)" strokeWidth="2" fill="none" />
          <path d="M 50% 100 L 50% 200" stroke="url(#lineGradient)" strokeWidth="2" fill="none" />
          <path d="M 50% 100 L 80% 200" stroke="url(#lineGradient)" strokeWidth="2" fill="none" />
        </svg>

        {/* Model nodes */}
        <div className="flex justify-around items-start relative" style={{ zIndex: 1 }}>
          {mockModels.map((model) => (
            <div
              key={model.name}
              className="px-4 py-3 rounded-xl text-center min-w-[140px]"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 justify-center mb-2">
                <Bot className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {model.name}
                </span>
                <StatusIndicator status={model.status as any} showLabel={false} size="sm" />
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-tertiary)' }}>Traffic</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{model.traffic}%</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-tertiary)' }}>Avg</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{model.latency}ms</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'settings') {
      setActiveTab('settings');
    }
  }, []);

  // Table columns for exceptions
  const exceptionColumns: Column<typeof mockExceptions[0]>[] = [
    {
      key: 'time',
      header: 'Time',
      sortable: true,
      width: '100px',
      render: (row) => (
        <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          {row.time}
        </span>
      ),
    },
    {
      key: 'clientId',
      header: 'Client_ID',
      render: (row) => (
        <span className="text-[12px] font-mono" style={{ color: 'var(--text-primary)' }}>
          {row.clientId}
        </span>
      ),
    },
    {
      key: 'violation',
      header: 'Violation / Rule',
      render: (row) => (
        <span className="text-[12px]" style={{ color: 'var(--text-primary)' }}>
          {row.violation}
        </span>
      ),
    },
    {
      key: 'snippet',
      header: 'Prompt Snippet',
      render: (row) => (
        <span
          className="text-[12px] font-mono truncate block max-w-[200px]"
          style={{ color: 'var(--text-tertiary)' }}
          title={row.snippet}
        >
          {row.snippet}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      width: '100px',
      render: (row) => <ActionBadge action={row.action} />,
    },
  ];

  return (
    <AppShell>
      <Header
        title="Dashboard"
        subtitle="Theo dõi hệ thống và cấu hình AI providers"
        tabs={[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'metrics', label: 'Metrics', icon: TrendingUp },
          { id: 'evaluations', label: 'Evaluations', icon: CheckCircle },
          { id: 'settings', label: 'Settings', icon: Settings },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actions={
          <button
            onClick={() => setLoading(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {activeTab === 'settings' ? (
          <div className="space-y-6">
            <ApiKeysSettings />
            <FanpageSettings />
          </div>
        ) : (
          <>
        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            title="Processed Prompts"
            value="124k"
            icon={<Zap className="w-4 h-4" />}
            trend={{ value: mockStats.promptsTrend, direction: 'up', label: 'vs yesterday' }}
            sparkline={{
              values: [80, 95, 88, 102, 98, 110, 124],
              color: 'var(--accent-purple)',
            }}
          />
          <MetricCard
            title="Avg. Latency"
            value={mockStats.avgLatency}
            suffix="ms"
            icon={<Clock className="w-4 h-4" />}
            trend={{ value: 45, direction: 'up', label: 'vs yesterday' }}
            sparkline={{
              values: [650, 720, 680, 750, 800, 780, 850],
              color: 'var(--accent-yellow)',
            }}
          />
          <MetricCard
            title="Total Cost"
            value={mockStats.totalCost.toFixed(2)}
            prefix="$"
            icon={<TrendingUp className="w-4 h-4" />}
            trend={{ value: mockStats.costTrend, direction: 'down', label: 'vs yesterday' }}
            sparkline={{
              values: [520, 490, 510, 480, 470, 460, 452],
              color: 'var(--accent-green)',
            }}
          />
        </div>

        {/* Flow Diagram */}
        <FlowDiagram />

        {/* Exceptions Table */}
        <DataTable
          data={mockExceptions}
          columns={exceptionColumns}
          title="Guardrail Exceptions"
          subtitle="Recent policy violations and system errors"
          filterable
          filterOptions={[
            { label: 'All', value: 'all' },
            { label: 'Blocked', value: 'blocked' },
            { label: 'Fallback', value: 'fallback' },
            { label: 'Retried', value: 'retried' },
          ]}
          pageSize={5}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div
            className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(52, 211, 153, 0.15)' }}
            >
              <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent-green)' }} />
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Success Rate</p>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>99.2%</p>
            </div>
          </div>

          <div
            className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(248, 113, 113, 0.15)' }}
            >
              <XCircle className="w-5 h-5" style={{ color: 'var(--accent-red)' }} />
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Errors (24h)</p>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>23</p>
            </div>
          </div>

          <div
            className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(251, 191, 36, 0.15)' }}
            >
              <AlertTriangle className="w-5 h-5" style={{ color: 'var(--accent-yellow)' }} />
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Warnings</p>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>47</p>
            </div>
          </div>

          <div
            className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(79, 140, 255, 0.15)' }}
            >
              <Bot className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Active Models</p>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>3</p>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
