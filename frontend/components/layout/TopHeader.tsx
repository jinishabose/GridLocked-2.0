'use client';

import React, { useState } from 'react';
import { Bell, Sun, Moon, User, MapPin, Calendar, Clock, ChevronDown, Upload } from 'lucide-react';
import { useGridLockedStore } from '@/lib/store';
import { useTheme } from '@/components/providers/ThemeProvider';
import { format } from 'date-fns';

const REGIONS = ['Bengaluru', 'Delhi NCR', 'Mumbai', 'Hyderabad', 'Chennai', 'All India'];
const CORRIDORS_QUICK = ['All Corridors', 'ORR North 1', 'ORR North 2', 'ORR East 1', 'ORR East 2', 'Bellary Road 1', 'Bellary Road 2', 'Hosur Road', 'Mysore Road', 'Tumkur Road', 'Bannerghata Road'];
export function TopHeader() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const {
    filters,
    setFilter,
    resetFilters,
    filteredEvents,
    isLoading,
    loadCSV,
    alerts,
    notificationCount,
    settings,
    updateSettings,
  } = useGridLockedStore();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        loadCSV(text);
      }
    };
    reader.readAsText(file);
  };

  const exportData = (formatType: 'json' | 'csv') => {
    if (filteredEvents.length === 0) return;
    if (formatType === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredEvents, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `filtered_events_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      const headers = Object.keys(filteredEvents[0]).join(',');
      const rows = filteredEvents.map(ev => 
        Object.values(ev).map(val => {
          const str = String(val ?? '');
          return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',')
      );
      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent([headers, ...rows].join('\n'));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", csvContent);
      downloadAnchor.setAttribute("download", `filtered_events_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };

  return (
    <header className="app-header">
      {/* Platform Title */}
      <div className="flex items-center gap-2 mr-4">
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          TRAFFIC COMMAND CENTER
        </span>
        <span style={{ width: '1px', height: '14px', background: 'var(--border)' }} />
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          Bengaluru Metropolitan Region
        </span>
      </div>

      {/* Date Filter */}
      <div className="topbar-control gap-1">
        <Calendar size={12} style={{ color: 'var(--accent-cyan)' }} />
        <input
          type="date"
          className="bg-transparent border-none outline-none text-xs cursor-pointer"
          style={{ color: 'var(--text-secondary)' }}
          value={filters.date || ''}
          onChange={(e) => setFilter('date', e.target.value)}
        />
      </div>

      {/* Time Filter */}
      <div className="topbar-control gap-1 font-mono">
        <Clock size={12} style={{ color: 'var(--accent-cyan)' }} />
        <input
          type="time"
          className="bg-transparent border-none outline-none text-xs cursor-pointer font-mono"
          style={{ color: 'var(--text-secondary)' }}
          value={filters.time || ''}
          onChange={(e) => setFilter('time', e.target.value)}
        />
      </div>

      {/* Region Selector */}
      <div className="topbar-control gap-1">
        <MapPin size={12} style={{ color: 'var(--accent-cyan)' }} />
        <select
          className="bg-transparent border-none outline-none text-xs cursor-pointer"
          style={{ color: 'var(--text-secondary)' }}
          value={settings.region}
          onChange={(e) => updateSettings({ region: e.target.value })}
        >
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Corridor Filter */}
      <div className="topbar-control gap-1">
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Corridor:</span>
        <select
          className="bg-transparent border-none outline-none text-xs cursor-pointer"
          style={{ color: 'var(--text-secondary)' }}
          value={filters.corridor || 'all'}
          onChange={(e) => setFilter('corridor', e.target.value)}
        >
          {CORRIDORS_QUICK.map((c) => (
            <option key={c} value={c === 'All Corridors' ? 'all' : c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Upload CSV */}
      <label className="topbar-control cursor-pointer" title="Upload events CSV">
        <Upload size={12} />
        <span className="text-xs">{isLoading ? 'Loading…' : 'Import CSV'}</span>
        <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
      </label>

      {/* Notifications */}
      <div className="relative">
        <button
          className="topbar-control relative"
          onClick={() => setShowNotifications((v) => !v)}
          title="Notifications"
        >
          <Bell size={13} />
          {notificationCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white"
              style={{ fontSize: '9px', background: '#EF4444', fontWeight: 700 }}
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div
            className="absolute right-0 top-full mt-1 w-80 gl-card-elevated z-50 overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            <div className="px-3 py-2 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border)' }}>
              <span className="section-title">ALERTS</span>
              <span style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>
                {notificationCount} unread
              </span>
            </div>
            <div className="max-h-72 overflow-y-auto scroll-panel">
              {alerts.slice(0, 8).map((alert) => (
                <div key={alert.id} className={`alert-chip ${alert.severity.toLowerCase()}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate" style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                      {alert.title}
                    </div>
                    <div className="truncate mt-0.5" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {alert.location}
                    </div>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="px-3 py-4 text-center" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  No active alerts
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Theme Toggle */}
      <button
        className="topbar-control"
        onClick={toggleTheme}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
      </button>

      {/* Profile / Admin Menu */}
      <div className="relative">
        <button className="topbar-control" onClick={() => setShowAdminMenu((v) => !v)}>
          <User size={13} />
          <span className="text-xs font-semibold">Admin</span>
          <ChevronDown size={11} />
        </button>
        {showAdminMenu && (
          <div
            className="absolute right-0 top-full mt-1 w-48 gl-card-elevated z-50 overflow-hidden"
            style={{ border: '1px solid var(--border)', background: 'var(--card-bg)' }}
          >
            <div className="flex flex-col py-1 text-xs">
              <button
                className="px-3 py-2 text-left hover:bg-zinc-800 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => {
                  resetFilters();
                  setShowAdminMenu(false);
                }}
              >
                Reset Filters
              </button>
              <button
                className="px-3 py-2 text-left hover:bg-zinc-800 transition-colors flex items-center justify-between"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => {
                  updateSettings({ autoRefresh: !settings.autoRefresh });
                }}
              >
                <span>Auto-Sync</span>
                <span className={settings.autoRefresh ? "text-emerald-500 font-semibold" : "text-zinc-500"}>
                  {settings.autoRefresh ? "ON" : "OFF"}
                </span>
              </button>
              <hr style={{ borderColor: 'var(--border)' }} />
              <button
                className="px-3 py-2 text-left hover:bg-zinc-800 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => {
                  exportData('json');
                  setShowAdminMenu(false);
                }}
              >
                Export Filtered JSON
              </button>
              <button
                className="px-3 py-2 text-left hover:bg-zinc-800 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => {
                  exportData('csv');
                  setShowAdminMenu(false);
                }}
              >
                Export Filtered CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
