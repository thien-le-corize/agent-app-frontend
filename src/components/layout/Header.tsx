'use client';

import { ChevronRight, LogOut } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';
import { logout } from '@/lib/auth';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Tab {
  id: string;
  label: string;
  icon?: React.ElementType;
}

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  title?: string;
  subtitle?: string;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  actions?: ReactNode;
  backHref?: string;
}

export default function Header({
  breadcrumbs,
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  actions,
  backHref,
}: HeaderProps) {
  return (
    <header
      className="h-14 flex items-center justify-between px-6"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-4">
        {/* Back Button */}
        {backHref && (
          <Link
            href={backHref}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </Link>
        )}

        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-[13px]">
            {breadcrumbs.map((item, index) => (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <ChevronRight
                    className="w-3.5 h-3.5"
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                )}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="hover:underline"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span style={{ color: 'var(--text-primary)' }}>
                    {item.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Title */}
        {title && !breadcrumbs && (
          <div>
            <h1
              className="text-[15px] font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className="text-[12px] mt-0.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Tabs */}
        {tabs && tabs.length > 0 && (
          <div
            className="flex items-center gap-1 ml-6 px-1 py-1 rounded-lg"
            style={{ background: 'var(--bg-elevated)' }}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all"
                  style={{
                    background: isActive ? 'var(--bg-surface)' : 'transparent',
                    color: isActive
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                    boxShadow: isActive
                      ? '0 1px 2px rgba(0,0,0,0.2)'
                      : 'none',
                  }}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {actions}
        <button
          onClick={logout}
          title="Đăng xuất"
          className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
