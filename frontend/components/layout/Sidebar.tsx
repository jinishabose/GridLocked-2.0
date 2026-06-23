'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CalendarClock,
  BrainCircuit,
  Users,
  ArrowLeftRight,
  Radio,
  BarChart2,
  BookOpen,
  Bot,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap,
} from 'lucide-react';
import { useGridLockedStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  {
    group: 'OPERATIONS',
    items: [
      { id: 'command-center', label: 'Command Center', icon: LayoutDashboard, href: '/' },
      { id: 'events', label: 'Event Dashboard', icon: CalendarClock, href: '/events' },
      { id: 'forecast', label: 'Forecast Engine', icon: BrainCircuit, href: '/forecast' },
      { id: 'resources', label: 'Resource Planner', icon: Users, href: '/resources' },
      { id: 'diversions', label: 'Diversion Planner', icon: ArrowLeftRight, href: '/diversions' },
      { id: 'monitor', label: 'Live Monitor', icon: Radio, href: '/monitor' },
    ],
  },
  {
    group: 'INTELLIGENCE',
    items: [
      { id: 'historical', label: 'Historical Intelligence', icon: BarChart2, href: '/historical' },
      { id: 'learning', label: 'Post Event Learning', icon: BookOpen, href: '/learning' },
      { id: 'copilot', label: 'AI Copilot', icon: Bot, href: '/copilot' },
    ],
  },
  {
    group: 'SYSTEM',
    items: [
      { id: 'reports', label: 'Reports', icon: FileText, href: '/reports' },
      { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
    ],
  },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, kpiMetrics } = useGridLockedStore();
  const pathname = usePathname();

  return (
    <aside className="app-sidebar flex flex-col" style={{ width: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-3 border-b" style={{ borderColor: 'var(--border)', minHeight: 'var(--header-height)' }}>
        {/* Logo icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #0F3D66 0%, #06B6D4 100%)' }}>
          <Activity size={16} className="text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="font-bold text-sm tracking-wide" style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}>
                GRID<span style={{ color: 'var(--accent-cyan)' }}>LOCKED</span>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '9px', letterSpacing: '0.12em' }}>
                PREDICT · PLAN · PREVENT
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="ml-auto p-1 rounded hover:bg-white/5 transition-colors flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Live Status Indicator */}
      {!sidebarCollapsed && kpiMetrics && (
        <div className="mx-3 mt-2 px-3 py-2 rounded flex items-center gap-2"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#22C55E', animation: 'blink 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: '10px', color: '#22C55E', fontWeight: 600, letterSpacing: '0.06em' }}>
            LIVE · {kpiMetrics.totalEvents.toLocaleString()} EVENTS
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scroll-panel">
        {NAV_ITEMS.map((group) => (
          <div key={group.group} className="mb-2">
            {!sidebarCollapsed && (
              <div className="px-2 py-1 mb-1 section-title">
                {group.group}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link key={item.id} href={item.href}>
                  <div
                    className={cn('nav-item', isActive && 'active')}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon size={15} className="nav-icon flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {/* Alert dot for copilot */}
                    {item.id === 'copilot' && !sidebarCollapsed && (
                      <span className="ml-auto flex-shrink-0 w-1.5 h-1.5 rounded-full"
                        style={{ background: 'var(--accent-cyan)' }} />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom — Code Crumbles Branding */}
      {!sidebarCollapsed && (
        <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Zap size={12} style={{ color: 'var(--accent-cyan)' }} />
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                Developed By: Code Crumbles
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', opacity: 0.6 }}>
                GridLock 2.0 Challenge Platform
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
