'use client';
import React, { useState } from 'react';
import { Bot, Flame, AlertTriangle, TrendingUp, Lightbulb, Search, Send, Shield, BarChart2 } from 'lucide-react';
import { useGridLockedStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { queryTrafficAssistant } from '@/lib/trafficAssistant';

const QUERY_TEMPLATES = [
  'Show high-risk weekend events on ORR',
  'Identify under-deployed corridors',
  'Which event type causes longest delays?',
  'Top 5 hotspot junctions this month',
  'Recommend additional officer deployment',
  'Analyze Bellary Road congestion pattern',
  'Generate executive summary',
  'Detect anomalous congestion scores',
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  pattern: <TrendingUp size={12} />,
  anomaly: <AlertTriangle size={12} />,
  optimization: <Shield size={12} />,
  forecast: <BarChart2 size={12} />,
  risk: <Flame size={12} />,
  policy: <Lightbulb size={12} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  pattern: '#06B6D4',
  anomaly: '#EF4444',
  optimization: '#22C55E',
  forecast: '#F59E0B',
  risk: '#F97316',
  policy: '#94A3B8',
};

export default function AICopilot() {
  const { aiInsights, corridorStats, eventTypeStats, events, filteredEvents, kpiMetrics, selectEvent } = useGridLockedStore();
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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
            if (ev) selectEvent(ev);
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

  const filteredInsights = activeCategory
    ? aiInsights.filter(i => i.category === activeCategory)
    : aiInsights;

  const handleQuery = (q: string) => {
    const userMsg = q || query;
    if (!userMsg.trim()) return;
    setChatHistory(h => [...h, { role: 'user', content: userMsg }]);
    setQuery('');

    // Run query traffic assistant dynamically
    setTimeout(() => {
      const response = queryTrafficAssistant(userMsg, events, filteredEvents, kpiMetrics);
      setChatHistory(h => [...h, { role: 'ai', content: response.text }]);
    }, 400);
  };

  return (
    <div className="page-content flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Bot size={14} style={{ color: 'var(--accent-cyan)' }} />
        <h1 className="font-bold" style={{ fontSize: '14px', letterSpacing: '0.06em' }}>AI COPILOT</h1>
        <span className="section-title">Agentic Traffic Intelligence System · {aiInsights.length} insights generated</span>
      </div>

      <div className="grid grid-cols-3 gap-3 flex-1 min-h-0" style={{ minHeight: '500px' }}>
        {/* Left: Insights Panel */}
        <div className="col-span-2 flex flex-col gap-3">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap flex-shrink-0">
            <button
              className={`gl-btn-${activeCategory === null ? 'primary' : 'secondary'}`}
              style={{ fontSize: '10px', padding: '4px 10px' }}
              onClick={() => setActiveCategory(null)}
            >
              All Insights ({aiInsights.length})
            </button>
            {['pattern', 'risk', 'anomaly', 'optimization', 'forecast', 'policy'].map(cat => {
              const count = aiInsights.filter(i => i.category === cat).length;
              if (count === 0) return null;
              return (
                <button key={cat}
                  className={`gl-btn-${activeCategory === cat ? 'primary' : 'secondary'}`}
                  style={{ fontSize: '10px', padding: '4px 10px', gap: '4px', color: activeCategory === cat ? undefined : CATEGORY_COLORS[cat] }}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                >
                  {CATEGORY_ICONS[cat]}
                  {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
                </button>
              );
            })}
          </div>

          {/* Insights Grid */}
          <div className="overflow-y-auto scroll-panel flex-1 grid grid-cols-2 gap-2 content-start">
            <AnimatePresence>
              {filteredInsights.map((insight, i) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="gl-card p-3"
                  style={{ borderLeft: `3px solid ${CATEGORY_COLORS[insight.category]}` }}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span style={{ color: CATEGORY_COLORS[insight.category], flexShrink: 0, marginTop: '2px' }}>
                      {CATEGORY_ICONS[insight.category]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold" style={{ fontSize: '11px', color: 'var(--text-primary)', lineHeight: '1.3' }}>
                        {insight.title}
                      </div>
                      <div style={{ fontSize: '9px', color: CATEGORY_COLORS[insight.category], letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '2px' }}>
                        {insight.category} · {insight.dataPoints.toLocaleString()} data points
                      </div>
                    </div>
                    <span className={`risk-badge-${insight.impact === 'critical' ? 'critical' : insight.impact === 'high' ? 'high' : insight.impact === 'medium' ? 'medium' : 'low'} flex-shrink-0`}
                      style={{ fontSize: '9px', padding: '1px 5px' }}>
                      {insight.impact.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }}>
                    {insight.description}
                  </div>
                  <div className="p-2 rounded" style={{ background: `${CATEGORY_COLORS[insight.category]}0F`, border: `1px solid ${CATEGORY_COLORS[insight.category]}20` }}>
                    <div style={{ fontSize: '10px', color: CATEGORY_COLORS[insight.category], fontWeight: 600, marginBottom: '3px' }}>RECOMMENDED ACTION</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-primary)', lineHeight: '1.4' }}>{insight.recommendedAction}</div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="gl-progress flex-1">
                      <div className="gl-progress-fill" style={{ width: `${insight.confidence}%`, background: CATEGORY_COLORS[insight.category] }} />
                    </div>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{insight.confidence}% confidence</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Chat Interface */}
        <div className="flex flex-col gl-card overflow-hidden">
          {/* Chat Header */}
          <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: '#22C55E', animation: 'blink 1.5s ease-in-out infinite' }} />
            <span className="panel-title">AI COPILOT CHAT</span>
          </div>

          {/* Welcome / Chat History */}
          <div className="flex-1 overflow-y-auto scroll-panel p-3 space-y-2">
            {chatHistory.length === 0 && (
              <div className="text-center py-4">
                <Bot size={28} style={{ color: 'var(--accent-cyan)', margin: '0 auto 8px', opacity: 0.5 }} />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Ask me anything about the traffic data,<br />events, resources, or congestion patterns.
                </div>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-full p-2 rounded text-left"
                  style={{
                    maxWidth: '92%',
                    fontSize: '11px',
                    lineHeight: '1.5',
                    background: msg.role === 'user' ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.04)',
                    color: msg.role === 'user' ? 'var(--accent-cyan)' : 'var(--text-primary)',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Templates */}
          <div className="px-3 pb-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="section-title mb-2 mt-2">QUICK QUERIES</div>
            <div className="flex flex-wrap gap-1">
              {QUERY_TEMPLATES.slice(0, 4).map(t => (
                <button key={t} className="gl-btn-secondary" style={{ fontSize: '10px', padding: '3px 8px' }} onClick={() => handleQuery(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-3 pb-3 flex gap-2">
            <div className="flex-1 flex items-center gap-2 gl-input">
              <Search size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                className="flex-1 bg-transparent border-none outline-none text-xs"
                style={{ color: 'var(--text-primary)' }}
                placeholder="Ask about traffic patterns…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuery(query)}
              />
            </div>
            <button className="gl-btn-primary" style={{ padding: '6px 10px' }} onClick={() => handleQuery(query)}>
              <Send size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// AI Response Generation is handled by dynamic queryTrafficAssistant engine in lib/trafficAssistant.ts
