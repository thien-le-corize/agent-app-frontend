'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Workflow,
  Bot,
  Users,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Workflow', href: '/workflow', icon: Workflow },
  { label: 'Chatbots', href: '/chatbot-list', icon: Bot },
  { label: 'CRM', href: '/crm', icon: Users },
];

const bottomNav: NavItem[] = [
  { label: 'Help', href: '/help', icon: HelpCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`h-screen flex flex-col transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div
        className="h-14 flex items-center px-4 gap-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span
            className="font-semibold text-sm"
            style={{ color: 'var(--text-primary)' }}
          >
            AI Studio
          </span>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                collapsed ? 'justify-center' : ''
              }`}
              style={{
                background: active ? 'var(--bg-elevated)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className="w-4 h-4 flex-shrink-0"
                style={{ color: active ? 'var(--accent)' : 'inherit' }}
              />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge && (
                <span
                  className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: 'var(--accent)',
                    color: 'white',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div
        className="px-3 py-4 space-y-1"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {bottomNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                collapsed ? 'justify-center' : ''
              }`}
              style={{
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all hover:bg-[var(--bg-hover)] ${
            collapsed ? 'justify-center' : ''
          }`}
          style={{ color: 'var(--text-tertiary)' }}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
