'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, MapPin, ChevronRight, Flame, Bot } from 'lucide-react';
import { useGridLockedStore } from '@/lib/store';
import { truncateAddress, timeAgo, getCauseIcon, getMarkerColorHex } from '@/lib/utils';
import Link from 'next/link';

export function IntelligencePanel() {
  const { alerts, filteredEvents, aiInsights, corridorStats, selectedEvent, selectEvent } = useGridLockedStore();

  // Get upcoming events sorted by priority
  const upcomingEvents = [...filteredEvents]
    .filter((e) => e.status === 'active' || e.decision_priority === 'URGENT' || e.decision_priority === 'HIGH')
    .sort((a, b) => {
      const p = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return (p[a.decision_priority] || 3) - (p[b.decision_priority] || 3);
    })
    .slice(0, 12);

  const unresolvedAlerts = alerts.filter((a) => !a.acknowledged).slice(0, 8);

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Active Alerts */}
      <div className="gl-card flex-shrink-0" style={{ maxHeight: '200px' }}>
        <div className="px-3 pt-2 pb-1 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={12} style={{ color: '#EF4444' }} />
            <span className="section-title">ACTIVE ALERTS</span>
          </div>
          <span className="risk-badge-critical">{unresolvedAlerts.length}</span>
        </div>
        <div className="overflow-y-auto scroll-panel" style={{ maxHeight: '145px' }}>
          {unresolvedAlerts.length === 0 ? (
            <div className="px-3 py-3 text-center" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              No active alerts
            </div>
          ) : (
            unresolvedAlerts.map((alert) => {
              const isSelected = selectedEvent?.id === alert.eventId;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`alert-chip ${alert.severity.toLowerCase()} cursor-pointer`}
                  style={{ 
                    margin: '3px 6px', 
                    borderRadius: '4px',
                    border: isSelected ? '1px solid var(--accent-cyan)' : undefined,
                    boxShadow: isSelected ? '0 0 8px rgba(6, 182, 212, 0.4)' : undefined,
                  }}
                  onClick={() => {
                    const event = filteredEvents.find((e) => e.id === alert.eventId);
                    if (event) selectEvent(event);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate" style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                      {alert.title}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                      {truncateAddress(alert.location, 45)}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Upcoming Priority Events */}
      <div className="gl-card flex-shrink-0" style={{ maxHeight: '220px' }}>
        <div className="px-3 pt-2 pb-1 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Clock size={12} style={{ color: 'var(--accent-cyan)' }} />
            <span className="section-title">PRIORITY EVENTS</span>
          </div>
          <Link href="/events" className="text-xs flex items-center gap-1" style={{ color: 'var(--accent-cyan)' }}>
            All <ChevronRight size={10} />
          </Link>
        </div>
        <div className="overflow-y-auto scroll-panel" style={{ maxHeight: '168px' }}>
          {upcomingEvents.map((ev, i) => {
            const isSelected = selectedEvent?.id === ev.id;
            return (
              <div 
                key={ev.id} 
                className={`flex items-start gap-2 px-3 py-2 border-b cursor-pointer transition-colors ${
                  isSelected ? 'bg-cyan-950/20' : 'hover:bg-white/5'
                }`}
                style={{ 
                  borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-card)',
                }}
                onClick={() => selectEvent(ev)}
              >
                <span style={{ fontSize: '14px', flexShrink: 0 }}>{getCauseIcon(ev.event_cause)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold truncate" style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                      {ev.event_cause.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                    <span className={`risk-badge-${ev.decision_priority === 'URGENT' ? 'critical' : ev.decision_priority === 'HIGH' ? 'high' : ev.decision_priority === 'MEDIUM' ? 'medium' : 'low'} flex-shrink-0`}
                      style={{ fontSize: '9px', padding: '1px 5px' }}>
                      {ev.decision_priority}
                    </span>
                  </div>
                  <div className="truncate" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    <MapPin size={9} className="inline mr-0.5" />
                    {truncateAddress(ev.address, 42)}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ev.corridor}</span>
                    <span style={{ fontSize: '10px', color: getMarkerColorHex(ev.marker_color) }}>
                      {ev.congestion_label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Quick Insights */}
      <div className="gl-card flex-1 min-h-0">
        <div className="px-3 pt-2 pb-1 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Bot size={12} style={{ color: 'var(--accent-cyan)' }} />
            <span className="section-title">AI COPILOT INSIGHTS</span>
          </div>
          <Link href="/copilot" className="text-xs flex items-center gap-1" style={{ color: 'var(--accent-cyan)' }}>
            Full AI <ChevronRight size={10} />
          </Link>
        </div>
        <div className="overflow-y-auto scroll-panel flex-1 p-2">
          {aiInsights.slice(0, 4).map((insight, i) => (
            <div key={insight.id} className="mb-2 px-2 py-2 rounded"
              style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.08)' }}>
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  {insight.impact === 'critical' ? <Flame size={11} style={{ color: '#EF4444' }} /> :
                    insight.impact === 'high' ? <AlertTriangle size={11} style={{ color: '#F97316' }} /> :
                      <Bot size={11} style={{ color: 'var(--accent-cyan)' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold" style={{ fontSize: '11px', color: 'var(--text-primary)', lineHeight: '1.3' }}>
                    {insight.title}
                  </div>
                  <div className="mt-1" style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {insight.recommendedAction}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="gl-progress flex-1" style={{ height: '2px' }}>
                      <div className="gl-progress-fill" style={{ width: `${insight.confidence}%`, background: 'var(--accent-cyan)' }} />
                    </div>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{insight.confidence}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Corridors Quick View */}
      <div className="gl-card flex-shrink-0">
        <div className="px-3 pt-2 pb-1 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <MapPin size={12} style={{ color: 'var(--accent-cyan)' }} />
          <span className="section-title">TOP RISK CORRIDORS</span>
        </div>
        <div className="p-2 space-y-1.5">
          {corridorStats.filter(c => c.corridor !== 'Non-corridor').slice(0, 5).map((cs) => (
            <div key={cs.corridor} className="flex items-center gap-2">
              <span className="truncate flex-1" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                {cs.corridor}
              </span>
              <div className="gl-progress w-16 flex-shrink-0">
                <div className="gl-progress-fill"
                  style={{ width: `${cs.avgCongestionScore}%`, background: cs.avgCongestionScore >= 75 ? '#EF4444' : cs.avgCongestionScore >= 60 ? '#F97316' : '#F59E0B' }} />
              </div>
              <span className="font-mono flex-shrink-0" style={{ fontSize: '10px', color: 'var(--text-primary)', width: '24px', textAlign: 'right' }}>
                {cs.avgCongestionScore}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
