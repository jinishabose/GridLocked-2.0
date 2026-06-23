'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Radio,
  AlertTriangle,
  RefreshCw,
  Clock,
  Search,
  Bot,
  Send,
  Shield,
  Ban,
  Flame,
  SlidersHorizontal,
  Users,
  CheckCircle,
  MapPin,
  ChevronRight,
  Info
} from 'lucide-react';
import { useGridLockedStore } from '@/lib/store';
import { truncateAddress, getCauseIcon, getMarkerColorHex } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { queryTrafficAssistant } from '@/lib/trafficAssistant';
import type { TrafficEvent } from '@/types';

// Dynamic import of MapplsMap to prevent SSR compilation errors
const MapplsMap = dynamic(
  () => import('@/components/map/MapplsMap').then((m) => ({ default: m.MapplsMap })),
  {
    ssr: false,
    loading: () => (
      <div className="map-placeholder flex items-center justify-center" style={{ height: '100%' }}>
        <div className="text-center">
          <div className="gl-skeleton h-2 w-32 mx-auto mb-2" />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Loading simulation grid…</div>
        </div>
      </div>
    ),
  }
);

const CAUSES = [
  { value: 'all', label: 'All Causes' },
  { value: 'accident', label: 'Accidents' },
  { value: 'vehicle_breakdown', label: 'Breakdowns' },
  { value: 'tree_fall', label: 'Tree Falls' },
  { value: 'water_logging', label: 'Water Logging' },
  { value: 'pot_holes', label: 'Potholes' },
  { value: 'construction', label: 'Construction' },
  { value: 'congestion', label: 'Congestion' },
  { value: 'road_conditions', label: 'Road Conditions' }
];

const SEVERITIES = [
  { value: 'all', label: 'All Severities' },
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' }
];

const TIME_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'peak', label: 'Peak Commute' },
  { value: 'morning', label: 'Morning (7-11 AM)' },
  { value: 'evening', label: 'Evening (5-9 PM)' },
  { value: 'weekend', label: 'Weekends' }
];

export default function LiveMonitor() {
  const {
    events,
    filteredEvents,
    kpiMetrics,
    isLoading,
    loadError,
    dataLoaded,
    selectedEvent,
    selectEvent
  } = useGridLockedStore();

  // Local UI & Refresh States
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'ai-chat' | 'dispatch'>('feed');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [causeFilter, setCauseFilter] = useState('all');
  const [corridorFilter, setCorridorFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  // Chatbot State
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    {
      role: 'ai',
      content: `🤖 **Operational Traffic Assistant**\n\nCommand Center feed initialized. I can parse the current dataset to assist you. Try asking:\n\n* *"Summarize today's traffic situation"*\n* *"Which corridor has the most road closures?"*\n* *"Show active critical events near Raipur"*\n* *"Show top 5 highest risk incidents"*`
    }
  ]);
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Dispatch Log State
  const [dispatchedList, setDispatchedList] = useState<string[]>([]);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  // Trigger manual refresh simulation
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefreshed(new Date());
      setIsRefreshing(false);
    }, 800);
  };

  // Auto-refresh simulation
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setLastRefreshed(new Date());
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Scroll chatbot to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatTyping]);

  // Extract unique corridors from dataset for filter dropdown
  const uniqueCorridors = useMemo(() => {
    if (!events) return [];
    const list = new Set(events.map((e) => e.corridor).filter(Boolean));
    return Array.from(list).sort();
  }, [events]);

  // Filter Active Incidents locally for the dashboard
  const displayEvents = useMemo(() => {
    return filteredEvents.filter((ev) => {
      // Must be active incident
      if (ev.status !== 'active') return false;

      // Severity matching
      if (severityFilter !== 'all') {
        const labelMap: Record<string, string[]> = {
          Critical: ['Severe Congestion'],
          High: ['High Impact'],
          Medium: ['Moderate Impact'],
          Low: ['Low Impact']
        };
        const labels = labelMap[severityFilter];
        if (labels && !labels.includes(ev.congestion_label)) return false;
      }

      // Cause matching
      if (causeFilter !== 'all' && ev.event_cause !== causeFilter) return false;

      // Corridor matching
      if (corridorFilter !== 'all' && ev.corridor !== corridorFilter) return false;

      // Time range matching
      if (timeFilter !== 'all') {
        if (timeFilter === 'peak' && ev.is_peak_hour !== 1) return false;
        if (timeFilter === 'weekend' && ev.is_weekend !== 1) return false;
        if (timeFilter === 'morning' && (ev.event_hour === undefined || ev.event_hour < 7 || ev.event_hour > 11)) return false;
        if (timeFilter === 'evening' && (ev.event_hour === undefined || ev.event_hour < 17 || ev.event_hour > 21)) return false;
      }

      // Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchText = `${ev.id} ${ev.address} ${ev.event_cause} ${ev.corridor}`.toLowerCase();
        if (!matchText.includes(q)) return false;
      }

      return true;
    });
  }, [filteredEvents, severityFilter, causeFilter, corridorFilter, timeFilter, searchQuery]);

  // Calculate live counters based on active dataset (events loaded)
  const liveKPIs = useMemo(() => {
    const active = events.filter((e) => e.status === 'active');
    const critical = active.filter(
      (e) => e.congestion_label === 'Severe Congestion' || e.congestion_risk_score >= 70
    );
    const closures = active.filter((e) => e.requires_road_closure || e.road_closure_flag === 1);
    const hotspots = active.filter((e) => e.is_hotspot === 1);

    return {
      active: active.length,
      critical: critical.length,
      closures: closures.length,
      hotspots: hotspots.length
    };
  }, [events]);

  // Triggered when clicking a location ID in chat
  const handleChatQuery = (textQuery: string) => {
    if (!textQuery.trim() || isChatTyping) return;
    setChatHistory((h) => [...h, { role: 'user', content: textQuery }]);
    setChatQuery('');
    setIsChatTyping(true);

    setTimeout(() => {
      const response = queryTrafficAssistant(textQuery, events, filteredEvents, kpiMetrics);
      setChatHistory((h) => [...h, { role: 'ai', content: response.text }]);
      setIsChatTyping(false);
    }, 600);
  };

  // Mock Dispatch action handler
  const handleDispatch = (evId: string) => {
    setDispatchStatus(`Dispatching Rapid Response units to ${evId}...`);
    setTimeout(() => {
      setDispatchedList((prev) => [...prev, evId]);
      setDispatchStatus(null);
      alert(`🚨 Dispatch Alert: Traffic units and highway patrols dispatched to Incident ${evId}. Alternate routes broadcasts sent.`);
    }, 1200);
  };

  // Helper to render chat markdown content with interactive highlight buttons
  const renderMessageContent = (content: string) => {
    const regex = /\[(FKID\d+)\]\(highlight:\/\/(FKID\d+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const matchIndex = match.index;
      const text = match[1];
      const id = match[2];

      if (matchIndex > lastIndex) {
        parts.push(content.substring(lastIndex, matchIndex));
      }

      parts.push(
        <button
          key={matchIndex}
          onClick={() => {
            const ev = events.find((e) => e.id === id);
            if (ev) {
              selectEvent(ev);
              setActiveTab('dispatch');
            }
          }}
          className="text-cyan-400 hover:text-cyan-300 font-mono font-bold underline px-1 bg-cyan-950/40 rounded border border-cyan-800/30 mx-0.5"
        >
          {text}
        </button>
      );

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return <div className="whitespace-pre-wrap">{parts.length > 0 ? parts : content}</div>;
  };

  // Synchronize Tab State on outer store selection
  useEffect(() => {
    if (selectedEvent && selectedEvent.status === 'active') {
      setActiveTab('dispatch');
    }
  }, [selectedEvent]);

  // Loading indicator helper
  const renderKPIValue = (val: number, color: string) => {
    if (isLoading || !dataLoaded) {
      return <div className="gl-skeleton h-6 w-16 my-1 bg-white/10" />;
    }
    return (
      <div className="kpi-value font-mono" style={{ color, fontSize: '24px' }}>
        {val}
      </div>
    );
  };

  return (
    <div className="page-content flex flex-col gap-3 h-full">
      {/* Top Controls & Status Bar */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio
              size={14}
              style={{ color: '#22C55E', animation: 'blink 1.5s ease-in-out infinite' }}
            />
            <h1
              className="font-bold text-sm tracking-wide text-white"
              style={{ letterSpacing: '0.06em' }}
            >
              LIVE OPERATIONS MONITOR
            </h1>
          </div>
          <span className="section-title">Code Crumbles Command Center</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Last Refreshed info */}
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Sync: {lastRefreshed.toLocaleTimeString()}
          </span>

          {/* Refresh controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              className={`gl-btn-secondary p-1.5 flex items-center justify-center ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              title="Force manual reload"
              disabled={isLoading}
            >
              <RefreshCw size={12} />
            </button>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={() => setAutoRefresh(!autoRefresh)}
                className="w-3 h-3 accent-cyan-400"
              />
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Auto-Sync</span>
            </label>
          </div>
        </div>
      </div>

      {/* KPI Indicators Row */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {[
          {
            label: 'Active Incidents',
            value: liveKPIs.active,
            color: '#22C55E',
            icon: <Radio size={14} />,
            bg: 'rgba(34,197,94,0.04)',
            border: 'rgba(34,197,94,0.15)'
          },
          {
            label: 'Critical Congestions',
            value: liveKPIs.critical,
            color: '#EF4444',
            icon: <AlertTriangle size={14} />,
            bg: 'rgba(239,68,68,0.04)',
            border: 'rgba(239,68,68,0.15)'
          },
          {
            label: 'Road Closures',
            value: liveKPIs.closures,
            color: '#F97316',
            icon: <Ban size={14} />,
            bg: 'rgba(249,115,22,0.04)',
            border: 'rgba(249,115,22,0.15)'
          },
          {
            label: 'Congestion Hotspots',
            value: liveKPIs.hotspots,
            color: '#06B6D4',
            icon: <Flame size={14} />,
            bg: 'rgba(6,182,212,0.04)',
            border: 'rgba(6,182,212,0.15)'
          }
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="gl-card p-3 flex flex-col justify-between"
            style={{
              background: kpi.bg,
              borderColor: kpi.border,
              boxShadow: `0 0 10px ${kpi.color}05`
            }}
          >
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {kpi.label}
              </span>
              <span style={{ color: kpi.color, opacity: 0.8 }}>{kpi.icon}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              {renderKPIValue(kpi.value, kpi.color)}
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Live updates active</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Core Layout: Map + Controls */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Left Side: Simulation Interactive Map (65%) */}
        <div className="flex-1 flex flex-col gl-card overflow-hidden" style={{ minWidth: 0 }}>
          <div
            className="px-3 py-2 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="panel-title flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              INTELLIGENT VECTOR GRID MAP
            </span>
            {selectedEvent && (
              <span
                style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}
                className="font-mono"
              >
                Tracking Incident: {selectedEvent.id}
              </span>
            )}
          </div>

          <div className="flex-1 relative min-h-[360px]">
            {/* Inject locally filtered events to MapplsMap */}
            <MapplsMap height="100%" customEvents={displayEvents} />

            {/* Error banner state */}
            {loadError && (
              <div
                className="absolute inset-0 flex items-center justify-center p-6 text-center"
                style={{ background: 'rgba(7,17,31,0.9)' }}
              >
                <div className="max-w-md p-4 rounded gl-card border border-red-500/30">
                  <AlertTriangle size={32} className="mx-auto mb-2 text-red-500" />
                  <h3 className="font-semibold text-white mb-1">Operational Sync Failure</h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }} className="mb-4">
                    {loadError}
                  </p>
                  <button onClick={handleManualRefresh} className="gl-btn-primary mx-auto">
                    Retry Synchronization
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Operational Control Hub Tabs (35%) */}
        <div className="w-[380px] flex-shrink-0 flex flex-col gl-card overflow-hidden">
          {/* Tab Header Controls */}
          <div
            className="flex border-b flex-shrink-0 bg-white/2"
            style={{ borderColor: 'var(--border)' }}
          >
            {[
              { id: 'feed', label: 'Incident Feed', icon: SlidersHorizontal },
              { id: 'ai-chat', label: 'AI Assistant', icon: Bot },
              { id: 'dispatch', label: 'Dispatch Detail', icon: Shield }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors border-b-2`}
                  style={{
                    fontSize: '11px',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    color: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    borderColor: activeTab === tab.id ? 'var(--accent-cyan)' : 'transparent',
                    background: activeTab === tab.id ? 'rgba(6,182,212,0.03)' : 'transparent'
                  }}
                >
                  <Icon size={12} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {/* Tab 1: Incident List and Filter Stream */}
              {activeTab === 'feed' && (
                <motion.div
                  key="feed-tab"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex flex-col"
                >
                  {/* Search and Filters Drawer */}
                  <div
                    className="p-3 border-b space-y-2.5 bg-white/2"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {/* Search query input */}
                    <div className="flex items-center gap-2 gl-input px-2.5 py-1.5">
                      <Search size={12} style={{ color: 'var(--text-muted)' }} />
                      <input
                        className="flex-1 bg-transparent border-none outline-none text-xs text-white"
                        placeholder="Search incident ID, area, cause..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    {/* Filter controls grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Severity */}
                      <div>
                        <label className="section-title block mb-1">Severity</label>
                        <select
                          className="gl-select w-full py-1 text-xs"
                          value={severityFilter}
                          onChange={(e) => setSeverityFilter(e.target.value)}
                        >
                          {SEVERITIES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cause */}
                      <div>
                        <label className="section-title block mb-1">Incident Cause</label>
                        <select
                          className="gl-select w-full py-1 text-xs"
                          value={causeFilter}
                          onChange={(e) => setCauseFilter(e.target.value)}
                        >
                          {CAUSES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Corridor */}
                      <div>
                        <label className="section-title block mb-1">Corridor</label>
                        <select
                          className="gl-select w-full py-1 text-xs"
                          value={corridorFilter}
                          onChange={(e) => setCorridorFilter(e.target.value)}
                        >
                          <option value="all">All Corridors</option>
                          {uniqueCorridors.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Time windows */}
                      <div>
                        <label className="section-title block mb-1">Time Range</label>
                        <select
                          className="gl-select w-full py-1 text-xs"
                          value={timeFilter}
                          onChange={(e) => setTimeFilter(e.target.value)}
                        >
                          {TIME_RANGES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Incident Feed List */}
                  <div className="flex-1 overflow-y-auto scroll-panel p-2 space-y-2">
                    {isLoading && (
                      <div className="space-y-2 p-2">
                        {Array.from({ length: 4 }).map((_, idx) => (
                          <div key={idx} className="gl-card p-3 space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="gl-skeleton h-3 w-16 bg-white/10" />
                              <div className="gl-skeleton h-3 w-10 bg-white/10" />
                            </div>
                            <div className="gl-skeleton h-2 w-full bg-white/5" />
                            <div className="gl-skeleton h-2 w-32 bg-white/5" />
                          </div>
                        ))}
                      </div>
                    )}

                    {!isLoading && displayEvents.length === 0 && (
                      <div className="flex flex-col items-center justify-center text-center p-6 h-full mt-10">
                        <Info size={24} style={{ color: 'var(--text-muted)', opacity: 0.5 }} className="mb-2" />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          No active incidents match current parameters.
                        </span>
                      </div>
                    )}

                    {!isLoading &&
                      displayEvents.map((ev) => {
                        const isSelected = selectedEvent?.id === ev.id;
                        const isDispatched = dispatchedList.includes(ev.id);
                        return (
                          <div
                            key={ev.id}
                            onClick={() => selectEvent(ev)}
                            className={`gl-card p-3 cursor-pointer transition-all border-l-3 hover:bg-white/4 relative ${
                              isSelected ? 'bg-cyan-950/15' : ''
                            }`}
                            style={{
                              borderLeftColor: getMarkerColorHex(ev.marker_color),
                              borderColor: isSelected ? 'rgba(6,182,212,0.4)' : undefined
                            }}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5">
                                <span style={{ fontSize: '14px' }}>
                                  {getCauseIcon(ev.event_cause)}
                                </span>
                                <span
                                  className="font-bold font-mono"
                                  style={{ fontSize: '11px', color: 'var(--text-primary)' }}
                                >
                                  {ev.id}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {isDispatched && (
                                  <span
                                    className="text-green-400 flex items-center gap-0.5 border border-green-500/20 px-1 py-0.2 rounded"
                                    style={{ fontSize: '8px', background: 'rgba(34,197,94,0.06)' }}
                                  >
                                    <CheckCircle size={8} /> DISPATCHED
                                  </span>
                                )}
                                <span
                                  className={`risk-badge-${
                                    ev.congestion_risk_score >= 75
                                      ? 'critical'
                                      : ev.congestion_risk_score >= 60
                                      ? 'high'
                                      : 'medium'
                                  }`}
                                  style={{ fontSize: '9px', padding: '1px 5px' }}
                                >
                                  {ev.congestion_label}
                                </span>
                              </div>
                            </div>

                            <div
                              style={{
                                fontSize: '10.5px',
                                color: 'var(--text-secondary)',
                                lineHeight: '1.4'
                              }}
                              className="mb-1.5"
                            >
                              {truncateAddress(ev.address, 48)}
                            </div>

                            <div
                              className="flex items-center justify-between"
                              style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}
                            >
                              <span>Corridor: {ev.corridor}</span>
                              <span className="font-mono text-cyan-400">
                                Score: {ev.congestion_risk_score.toFixed(0)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </motion.div>
              )}

              {/* Tab 2: Traffic Intelligence Chatbot Assistant */}
              {activeTab === 'ai-chat' && (
                <motion.div
                  key="chat-tab"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex flex-col"
                >
                  {/* Chat message box */}
                  <div className="flex-1 overflow-y-auto scroll-panel p-3 space-y-3">
                    {chatHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className="p-2.5 rounded max-w-[85%] text-left"
                          style={{
                            fontSize: '11px',
                            lineHeight: '1.5',
                            background:
                              msg.role === 'user'
                                ? 'rgba(6,182,212,0.1)'
                                : 'rgba(255,255,255,0.03)',
                            color: msg.role === 'user' ? 'var(--accent-cyan)' : 'var(--text-primary)',
                            border: `1px solid ${
                              msg.role === 'user'
                                ? 'rgba(6,182,212,0.2)'
                                : 'rgba(255,255,255,0.05)'
                            }`,
                            boxShadow: msg.role === 'ai' ? '0 1px 2px rgba(0,0,0,0.2)' : undefined
                          }}
                        >
                          {renderMessageContent(msg.content)}
                        </div>
                      </div>
                    ))}

                    {/* Chatbot typing loader */}
                    {isChatTyping && (
                      <div className="flex justify-start">
                        <div
                          className="p-2.5 rounded bg-white/2 border border-white/5 flex items-center gap-1.5"
                          style={{ fontSize: '10px', color: 'var(--text-muted)' }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          />
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                            style={{ animationDelay: '0.4s' }}
                          />
                          AI analyzing dataset...
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Quick Queries templates */}
                  <div
                    className="p-2 border-t flex flex-wrap gap-1 bg-white/2"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {[
                      'Summarize today\'s traffic',
                      'Which corridor has most closures?',
                      'Active critical near Raipur',
                      'Top 5 highest risk incidents'
                    ].map((text) => (
                      <button
                        key={text}
                        onClick={() => handleChatQuery(text)}
                        className="gl-btn-secondary py-1 px-2"
                        style={{ fontSize: '9px', borderRadius: '3px' }}
                      >
                        {text}
                      </button>
                    ))}
                  </div>

                  {/* Input form panel */}
                  <div className="p-2 flex gap-2 flex-shrink-0">
                    <input
                      className="flex-1 gl-input text-xs px-2.5 py-1.5 bg-transparent border border-white/10"
                      placeholder="Ask the AI about the dataset..."
                      value={chatQuery}
                      onChange={(e) => setChatQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChatQuery(chatQuery)}
                    />
                    <button
                      onClick={() => handleChatQuery(chatQuery)}
                      className="gl-btn-primary py-1 px-3 flex items-center justify-center"
                      title="Send query"
                    >
                      <Send size={11} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Tab 3: Resource Dispatch Detail and Action Matrix */}
              {activeTab === 'dispatch' && (
                <motion.div
                  key="dispatch-tab"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex flex-col p-4 space-y-4 overflow-y-auto scroll-panel"
                >
                  {selectedEvent ? (
                    <div className="space-y-4">
                      {/* Operational Status */}
                      <div className="border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold font-mono text-sm text-cyan-400">
                            {selectedEvent.id}
                          </span>
                          <span className="risk-badge-critical text-[10px]">
                            ACTIVE INCIDENT
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {selectedEvent.address}
                        </div>
                      </div>

                      {/* Incident Attributes */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="gl-card p-2">
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>CAUSE</div>
                          <div
                            className="font-semibold mt-0.5"
                            style={{ fontSize: '11px', color: 'var(--text-primary)' }}
                          >
                            {selectedEvent.event_cause.replace(/_/g, ' ').toUpperCase()}
                          </div>
                        </div>

                        <div className="gl-card p-2">
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>CORRIDOR</div>
                          <div
                            className="font-semibold mt-0.5 truncate"
                            style={{ fontSize: '11px', color: 'var(--text-primary)' }}
                          >
                            {selectedEvent.corridor}
                          </div>
                        </div>

                        <div className="gl-card p-2">
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>RISK LEVEL</div>
                          <div
                            className="font-semibold mt-0.5"
                            style={{
                              fontSize: '11px',
                              color: getMarkerColorHex(selectedEvent.marker_color)
                            }}
                          >
                            {selectedEvent.congestion_label} ({selectedEvent.congestion_risk_score.toFixed(0)}/100)
                          </div>
                        </div>

                        <div className="gl-card p-2">
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>DIVERSION</div>
                          <div
                            className="font-semibold mt-0.5"
                            style={{ fontSize: '11px', color: 'var(--text-primary)' }}
                          >
                            {selectedEvent.diversion_required === 'YES' ? 'REQUIRED' : 'NONE'}
                          </div>
                        </div>
                      </div>

                      {/* Resource Deployment Gap Analysis */}
                      <div className="gl-card p-3 space-y-2.5">
                        <span className="section-title block border-b pb-1" style={{ borderColor: 'var(--border)' }}>
                          RECOMMENDED DISPATCH MATRICES
                        </span>

                        <div className="flex justify-between items-center" style={{ fontSize: '11px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Police Personnel:</span>
                          <span className="font-mono text-white font-bold">
                            {selectedEvent.recommended_police} Officers
                          </span>
                        </div>

                        <div className="flex justify-between items-center" style={{ fontSize: '11px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Barricades:</span>
                          <span className="font-mono text-white font-bold">
                            {selectedEvent.recommended_barricades} Units
                          </span>
                        </div>

                        <div className="flex justify-between items-center" style={{ fontSize: '11px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Tow Trucks Required:</span>
                          <span className="font-mono text-white font-bold">
                            {selectedEvent.event_cause === 'vehicle_breakdown' ? '1 Tow Unit' : '0 Units'}
                          </span>
                        </div>
                      </div>

                      {/* Operator Action Block */}
                      <div className="pt-2">
                        {dispatchStatus ? (
                          <div className="text-center py-2 text-xs text-cyan-400 animate-pulse font-mono">
                            {dispatchStatus}
                          </div>
                        ) : dispatchedList.includes(selectedEvent.id) ? (
                          <div
                            className="w-full flex items-center justify-center gap-1.5 p-2 rounded border border-green-500/20 text-green-400 font-semibold"
                            style={{ background: 'rgba(34,197,94,0.05)', fontSize: '11px' }}
                          >
                            <CheckCircle size={14} /> OPERATIONS UNITS DISPATCHED
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDispatch(selectedEvent.id)}
                            className="w-full gl-btn-primary py-2 font-bold flex items-center justify-center gap-2 hover:bg-cyan-500/25"
                            style={{ fontSize: '11px' }}
                          >
                            <Shield size={14} /> DISPATCH RESPONSE TEAMS
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-6 h-full mt-10">
                      <MapPin size={24} style={{ color: 'var(--text-muted)', opacity: 0.5 }} className="mb-2" />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Select an active incident from the map or feed to view dispatch control tools.
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
