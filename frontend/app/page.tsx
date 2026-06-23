'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Radio, AlertTriangle, TrendingUp, Map, Shield, Ban, Activity,
  Flame, Users, BarChart2, X, Send, MapPin, Route
} from 'lucide-react';
import { useGridLockedStore } from '@/lib/store';
import { KPICard } from '@/components/ui/KPICard';
import dynamic from 'next/dynamic';
import { IntelligencePanel } from '@/components/dashboard/IntelligencePanel';
import { AnimatePresence } from 'framer-motion';

// Dynamic import to avoid SSR issues with canvas/map
const MapplsMap = dynamic(() => import('@/components/map/MapplsMap').then(m => ({ default: m.MapplsMap })), {
  ssr: false,
  loading: () => (
    <div className="map-placeholder flex items-center justify-center" style={{ height: '100%' }}>
      <div className="text-center">
        <div className="gl-skeleton h-2 w-32 mx-auto mb-2" />
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Initializing map…</div>
      </div>
    </div>
  ),
});

const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function CommandCenter() {
  const { kpiMetrics, isLoading, dataLoaded, filteredEvents, selectedEvent, selectEvent } = useGridLockedStore();

  const loading = isLoading || !dataLoaded;

  return (
    <div className="page-content flex flex-col gap-3 relative">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio size={14} style={{ color: '#22C55E', animation: 'blink 1.5s ease-in-out infinite' }} />
            <h1 className="font-bold" style={{ fontSize: '14px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
              COMMAND CENTER
            </h1>
          </div>
          <span className="section-title">Bengaluru Traffic Operations</span>
        </div>
        <div className="flex items-center gap-2">
          {dataLoaded && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {filteredEvents.length.toLocaleString()} events loaded
            </span>
          )}
          <span className="status-active">LIVE</span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <motion.div
        className="grid gap-3 flex-shrink-0"
        style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}
        variants={CONTAINER_VARIANTS}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={CARD_VARIANTS}>
          <KPICard
            label="Active Events"
            value={loading ? '—' : kpiMetrics?.activeEvents ?? 0}
            accentColor="#22C55E"
            icon={<Radio size={14} />}
            sublabel="Currently active"
            loading={loading}
          />
        </motion.div>
        <motion.div variants={CARD_VARIANTS}>
          <KPICard
            label="High Risk Events"
            value={loading ? '—' : kpiMetrics?.highRiskEvents ?? 0}
            accentColor="#F97316"
            icon={<AlertTriangle size={14} />}
            sublabel="High + Critical"
            loading={loading}
          />
        </motion.div>
        <motion.div variants={CARD_VARIANTS}>
          <KPICard
            label="Congestion Score"
            value={loading ? '—' : kpiMetrics?.predictedCongestionScore ?? 0}
            unit="/100"
            accentColor={
              (kpiMetrics?.predictedCongestionScore ?? 0) >= 75 ? '#EF4444' :
                (kpiMetrics?.predictedCongestionScore ?? 0) >= 60 ? '#F97316' :
                  (kpiMetrics?.predictedCongestionScore ?? 0) >= 45 ? '#F59E0B' : '#22C55E'
            }
            icon={<TrendingUp size={14} />}
            sublabel="Predicted average"
            loading={loading}
          />
        </motion.div>
        <motion.div variants={CARD_VARIANTS}>
          <KPICard
            label="Affected Corridors"
            value={loading ? '—' : kpiMetrics?.affectedCorridors ?? 0}
            accentColor="#06B6D4"
            icon={<Map size={14} />}
            sublabel="Active corridors"
            loading={loading}
          />
        </motion.div>
        <motion.div variants={CARD_VARIANTS}>
          <KPICard
            label="Recommended Officers"
            value={loading ? '—' : kpiMetrics?.recommendedOfficers ?? 0}
            accentColor="#F59E0B"
            icon={<Shield size={14} />}
            sublabel="Deployment needed"
            loading={loading}
          />
        </motion.div>
        <motion.div variants={CARD_VARIANTS}>
          <KPICard
            label="Road Closures"
            value={loading ? '—' : kpiMetrics?.roadClosures ?? 0}
            accentColor="#EF4444"
            icon={<Ban size={14} />}
            sublabel="Active closures"
            loading={loading}
          />
        </motion.div>
      </motion.div>

      {/* Secondary KPI Row */}
      <motion.div
        className="grid gap-3 flex-shrink-0"
        style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}
        variants={CONTAINER_VARIANTS}
        initial="hidden"
        animate="show"
      >
        {[
          { label: 'Total Events', value: kpiMetrics?.totalEvents, color: '#94A3B8', icon: <BarChart2 size={12} /> },
          { label: 'Critical Events', value: kpiMetrics?.criticalEvents, color: '#EF4444', icon: <Flame size={12} /> },
          { label: 'Planned Events', value: kpiMetrics?.plannedEvents, color: '#22C55E', icon: <Activity size={12} /> },
          { label: 'Unplanned Events', value: kpiMetrics?.unplannedEvents, color: '#F59E0B', icon: <AlertTriangle size={12} /> },
          { label: 'Event Hotspots', value: kpiMetrics?.hotspots, color: '#F97316', icon: <Flame size={12} /> },
          { label: 'Diversions Required', value: kpiMetrics?.diversionsRequired, color: '#06B6D4', icon: <Map size={12} /> },
        ].map((item) => (
          <motion.div key={item.label} variants={CARD_VARIANTS}>
            <div className="kpi-card" style={{
              '--kpi-accent': item.color,
              padding: '10px 14px'
            } as React.CSSProperties} >
              <div className="flex items-center justify-between mb-1">
                <span className="kpi-label">{item.label}</span>
                <span style={{ color: item.color, opacity: 0.7 }}>{item.icon}</span>
              </div>
              <div className="kpi-value" style={{ fontSize: '22px', color: item.color }}>
                {loading ? '—' : (item.value ?? 0).toLocaleString()}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Row: Map + Intelligence Panel */}
      <motion.div
        className="flex gap-3 flex-1 min-h-0"
        style={{ minHeight: '420px' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        {/* Map — 70% */}
        <div className="flex-1" style={{ minWidth: 0 }}>
          <MapplsMap height="100%" />
        </div>

        {/* Intelligence Panel — 30% */}
        <div className="flex flex-col" style={{ width: '310px', flexShrink: 0 }}>
          <IntelligencePanel />
        </div>
      </motion.div>

      {/* Sliding Side Drawer Panel */}
      <AnimatePresence>
        {selectedEvent && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => selectEvent(null)}
              className="fixed inset-0 bg-black z-40"
            />
            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-96 bg-zinc-950/95 border-l border-zinc-800 z-50 flex flex-col p-6 shadow-2xl overflow-y-auto scroll-panel"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-850 mb-4 flex-shrink-0">
                <div>
                  <div className="text-[10px] text-cyan-400 font-mono tracking-wider font-bold">EVENT ANALYSIS PANEL</div>
                  <h2 className="text-sm font-bold text-white font-mono mt-1">{selectedEvent.id}</h2>
                </div>
                <button
                  onClick={() => selectEvent(null)}
                  className="p-1 hover:bg-zinc-900 rounded transition-colors text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status & Priority badges */}
              <div className="flex gap-2 mb-4 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  selectedEvent.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {selectedEvent.status.toUpperCase()}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  selectedEvent.decision_priority === 'URGENT' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  selectedEvent.decision_priority === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                  selectedEvent.decision_priority === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-zinc-800 text-zinc-400'
                }`}>
                  {selectedEvent.decision_priority} PRIORITY
                </span>
              </div>

              {/* General details */}
              <div className="space-y-4 text-xs flex-1">
                {/* Cause & Corridor */}
                <div className="grid grid-cols-2 gap-2 bg-zinc-900/50 p-3 rounded border border-zinc-850">
                  <div>
                    <div className="text-zinc-500 text-[10px] mb-1 font-bold">INCIDENT CAUSE</div>
                    <div className="font-semibold text-white capitalize">
                      {selectedEvent.event_cause.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500 text-[10px] mb-1 font-bold">CORRIDOR</div>
                    <div className="font-semibold text-white truncate">{selectedEvent.corridor}</div>
                  </div>
                </div>

                {/* Address */}
                <div className="bg-zinc-900/50 p-3 rounded border border-zinc-850">
                  <div className="text-zinc-500 text-[10px] mb-1 flex items-center gap-1 font-bold">
                    <MapPin size={10} className="text-cyan-400" /> LOCATION ADDRESS
                  </div>
                  <div className="text-zinc-300 leading-normal font-sans">{selectedEvent.address}</div>
                  <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                    Coords: {selectedEvent.latitude.toFixed(6)}, {selectedEvent.longitude.toFixed(6)}
                  </div>
                </div>

                {/* Congestion Impact */}
                <div className="bg-zinc-900/50 p-3 rounded border border-zinc-850">
                  <div className="text-zinc-500 text-[10px] mb-2 flex items-center gap-1 font-bold">
                    <AlertTriangle size={10} className="text-orange-400" /> CONGESTION IMPACT ANALYSIS
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
                      <span className="font-mono font-bold text-sm" style={{ color: selectedEvent.congestion_risk_score >= 75 ? '#EF4444' : selectedEvent.congestion_risk_score >= 60 ? '#F97316' : '#F59E0B' }}>
                        {selectedEvent.congestion_risk_score}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">{selectedEvent.congestion_label}</div>
                      <div className="text-zinc-400 text-[11px] mt-0.5">
                        Predicted Delay: <span className="font-semibold text-white">{selectedEvent.duration_hours.toFixed(1)} hours</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommended Deployment */}
                <div className="bg-zinc-900/50 p-3 rounded border border-zinc-850">
                  <div className="text-zinc-500 text-[10px] mb-2 flex items-center gap-1 font-bold">
                    <Shield size={10} className="text-cyan-400" /> RECOMMENDED RESOURCES
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-zinc-950 p-2 rounded border border-zinc-850">
                      <div className="text-lg font-bold font-mono text-cyan-400">{selectedEvent.recommended_police}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Police Officers</div>
                    </div>
                    <div className="bg-zinc-950 p-2 rounded border border-zinc-850">
                      <div className="text-lg font-bold font-mono text-cyan-400">{selectedEvent.recommended_barricades}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Barricades Needed</div>
                    </div>
                  </div>
                </div>

                {/* Diversion route */}
                {selectedEvent.diversion_required === 'YES' && (
                  <div className="bg-cyan-950/20 p-3 rounded border border-cyan-800/20">
                    <div className="text-cyan-400 text-[10px] mb-1 flex items-center gap-1 font-bold">
                      <Route size={10} /> DIVERSION ACTIVATED
                    </div>
                    <div className="text-zinc-300 text-[11px] leading-normal">
                      Diversion is active. Priority: <span className="font-bold text-cyan-400">{selectedEvent.diversion_priority}</span>. Alternate routes are mapped on the live view.
                    </div>
                  </div>
                )}

                {/* Action Plan */}
                <div>
                  <div className="text-zinc-500 text-[10px] mb-1 font-bold">TACTICAL ACTION PLAN</div>
                  <div className="bg-zinc-900 p-3 rounded border border-zinc-800 text-zinc-300 leading-relaxed italic text-[11px]">
                    {selectedEvent.recommended_action || 'No customized action plan drafted for this event type. Deploy default response protocol.'}
                  </div>
                </div>
              </div>

              {/* Dispatch Simulation button */}
              <div className="pt-4 border-t border-zinc-850 mt-4 flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    alert(`Dispatched ${selectedEvent.recommended_police} officers & ${selectedEvent.recommended_barricades} barricades to ${selectedEvent.address}`);
                    selectEvent(null);
                  }}
                  className="w-full py-2.5 px-4 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold font-mono text-[11px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Send size={12} />
                  DISPATCH PROTOCOL
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
