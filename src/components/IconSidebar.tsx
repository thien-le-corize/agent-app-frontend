'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Home,
  Workflow,
  Layers,
  Grid3X3,
  GitBranch,
  HelpCircle,
  Bell,
  User,
  Sparkles,
} from 'lucide-react';

interface IconSidebarProps {
  activePage?: string;
}

const topItems = [
  { id: 'home', icon: Home, href: '/' },
  { id: 'workflow', icon: Workflow, href: '/workflow' },
  { id: 'layers', icon: Layers, href: '#' },
  { id: 'grid', icon: Grid3X3, href: '#' },
  { id: 'git', icon: GitBranch, href: '#' },
];

const bottomItems = [
  { id: 'help', icon: HelpCircle, href: '#' },
  { id: 'notifications', icon: Bell, href: '#' },
];

export default function IconSidebar({ activePage = 'workflow' }: IconSidebarProps) {
  return (
    <div className="icon-sidebar">
      {/* Logo */}
      <Link
        href="/workflow"
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
        style={{ background: 'var(--accent)' }}
      >
        <Sparkles className="w-5 h-5 text-white" />
      </Link>

      {/* Top items */}
      <div className="flex-1 flex flex-col gap-1">
        {topItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`icon-sidebar-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </div>

      {/* Bottom items */}
      <div className="flex flex-col gap-1">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.id} href={item.href} className="icon-sidebar-item">
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
        <div className="icon-sidebar-item mt-2">
          <User className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
