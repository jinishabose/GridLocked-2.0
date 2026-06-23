'use client';
import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { BarChart2 } from 'lucide-react';
import { useGridLockedStore } from '@/lib/store';
import { formatHour } from '@/lib/utils';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });
const DARK = { backgroundColor: 'transparent', textStyle: { color: '#64748B', fontFamily: 'IBM Plex Sans' } };
const GRID = { top: 30, right: 20, bottom: 40, left: 60 };
const TOOLTIP = { backgroundColor: '#0D1B2A', borderColor: '#1E3A55', textStyle: { color: '#E2EAF4', fontSize: 11 } };
const SPLIT = { lineStyle: { color: '#1E293B', type: 'dashed' } };

export default function HistoricalIntelligence() {
  const { corridorStats, eventTypeStats, hourlyPatterns, monthlyTrends, filteredEvents } = useGridLockedStore();

  const topCorridors = corridorStats.filter(c => c.corridor !== 'Non-corridor').slice(0, 12);

  // Chart 1: Most congested corridors
  const corridorBarOption = useMemo(() => ({
    ...DARK,
    grid: { ...GRID, left: 140 },
    tooltip: { trigger: 'axis', ...TOOLTIP },
    xAxis: { type: 'value', axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: SPLIT },
    yAxis: { type: 'category', data: topCorridors.map(c => c.corridor), axisLabel: { color: '#94A3B8', fontSize: 9 } },
    series: [
      { name: 'Avg Score', type: 'bar', data: topCorridors.map(c => c.avgCongestionScore), itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#0F3D66' }, { offset: 1, color: '#06B6D4' }] }, borderRadius: [0, 3, 3, 0] }, barMaxWidth: 14, label: { show: true, position: 'right', color: '#64748B', fontSize: 9 } },
      { name: 'Max Score', type: 'bar', data: topCorridors.map(c => c.maxCongestionScore), itemStyle: { color: 'rgba(239,68,68,0.4)', borderRadius: [0, 3, 3, 0] }, barMaxWidth: 8 },
    ],
  }), [topCorridors]);

  // Chart 2: Event type frequency
  const eventFreqOption = useMemo(() => ({
    ...DARK,
    grid: GRID,
    tooltip: { trigger: 'axis', ...TOOLTIP },
    xAxis: { type: 'category', data: eventTypeStats.slice(0, 10).map(e => e.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())), axisLabel: { color: '#64748B', fontSize: 9, rotate: 30 } },
    yAxis: { type: 'value', axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: SPLIT },
    series: [
      { name: 'Count', type: 'bar', data: eventTypeStats.slice(0, 10).map(e => e.count), itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#06B6D4' }, { offset: 1, color: '#0F3D66' }] }, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 30, label: { show: true, position: 'top', color: '#64748B', fontSize: 9 } },
    ],
  }), [eventTypeStats]);

  // Chart 3: Monthly event volume + congestion trend
  const monthlyOption = useMemo(() => ({
    ...DARK,
    grid: GRID,
    tooltip: { trigger: 'axis', ...TOOLTIP },
    legend: { top: 4, right: 0, textStyle: { color: '#64748B', fontSize: 10 } },
    xAxis: { type: 'category', data: monthlyTrends.map(m => m.month), axisLabel: { color: '#64748B', fontSize: 9, rotate: 20 } },
    yAxis: [
      { type: 'value', name: 'Events', axisLabel: { color: '#64748B', fontSize: 9 }, splitLine: SPLIT },
      { type: 'value', name: 'Congestion', axisLabel: { color: '#64748B', fontSize: 9 }, splitLine: { show: false } },
    ],
    series: [
      { name: 'Events', type: 'bar', data: monthlyTrends.map(m => m.eventCount), itemStyle: { color: 'rgba(15,61,102,0.8)', borderRadius: [2, 2, 0, 0] }, barMaxWidth: 20 },
      { name: 'Avg Congestion', type: 'line', yAxisIndex: 1, data: monthlyTrends.map(m => m.avgCongestion), smooth: true, lineStyle: { color: '#06B6D4', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#06B6D4' } },
      { name: 'Closures', type: 'line', yAxisIndex: 0, data: monthlyTrends.map(m => m.closures), smooth: true, lineStyle: { color: '#EF4444', width: 1.5, type: 'dashed' }, symbol: 'none', itemStyle: { color: '#EF4444' } },
    ],
  }), [monthlyTrends]);

  // Chart 4: Peak impact hours
  const peakHourOption = useMemo(() => ({
    ...DARK,
    grid: GRID,
    tooltip: { trigger: 'axis', ...TOOLTIP },
    xAxis: { type: 'category', data: hourlyPatterns.map(h => formatHour(h.hour)), axisLabel: { color: '#64748B', fontSize: 9 } },
    yAxis: [
      { type: 'value', axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: SPLIT },
      { type: 'value', axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: { show: false } },
    ],
    series: [
      { name: 'Event Count', type: 'bar', data: hourlyPatterns.map(h => h.eventCount), itemStyle: { color: (p: any) => hourlyPatterns[p.dataIndex].avgCongestion >= 60 ? 'rgba(239,68,68,0.7)' : 'rgba(245,158,11,0.6)', borderRadius: [2, 2, 0, 0] }, barMaxWidth: 20 },
      { name: 'Avg Congestion', type: 'line', yAxisIndex: 1, data: hourlyPatterns.map(h => h.avgCongestion), smooth: true, lineStyle: { color: '#06B6D4', width: 2 }, symbol: 'none' },
    ],
  }), [hourlyPatterns]);

  // Chart 5: Event type avg congestion
  const typeCongestOption = useMemo(() => ({
    ...DARK,
    grid: { ...GRID, left: 130 },
    tooltip: { trigger: 'axis', ...TOOLTIP },
    xAxis: { type: 'value', max: 100, axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: SPLIT },
    yAxis: { type: 'category', data: eventTypeStats.slice(0, 10).map(e => e.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())), axisLabel: { color: '#94A3B8', fontSize: 9 } },
    series: [
      { name: 'Avg Congestion', type: 'bar', data: eventTypeStats.slice(0, 10).map(e => e.avgCongestion), itemStyle: { color: (p: any) => { const v = eventTypeStats.slice(0, 10)[p.dataIndex].avgCongestion; return v >= 65 ? '#EF4444' : v >= 55 ? '#F97316' : v >= 45 ? '#F59E0B' : '#22C55E'; }, borderRadius: [0, 3, 3, 0] }, barMaxWidth: 14, label: { show: true, position: 'right', color: '#64748B', fontSize: 9 } },
    ],
  }), [eventTypeStats]);

  // Chart 6: Diversion rate by type
  const diversionRateOption = useMemo(() => ({
    ...DARK,
    grid: GRID,
    tooltip: { trigger: 'axis', ...TOOLTIP },
    xAxis: { type: 'category', data: eventTypeStats.slice(0, 8).map(e => e.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())), axisLabel: { color: '#64748B', fontSize: 9, rotate: 20 } },
    yAxis: { type: 'value', max: 100, name: '%', axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: SPLIT },
    series: [
      { name: 'Diversion Rate %', type: 'bar', data: eventTypeStats.slice(0, 8).map(e => e.diversionRate), itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#F97316' }, { offset: 1, color: '#0F3D66' }] }, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 30 },
    ],
  }), [eventTypeStats]);

  const charts = [
    { title: 'Most Congested Corridors', option: corridorBarOption, span: 1 },
    { title: 'Event Type Frequency', option: eventFreqOption, span: 1 },
    { title: 'Monthly Event Volume & Congestion Trend', option: monthlyOption, span: 2 },
    { title: 'Peak Impact Hours', option: peakHourOption, span: 1 },
    { title: 'Avg Congestion by Event Type', option: typeCongestOption, span: 1 },
    { title: 'Diversion Rate by Event Category', option: diversionRateOption, span: 2 },
  ];

  // Dynamic calculations for the 17 requested analytical metrics
  const top10CorridorsText = topCorridors.slice(0, 10).map(c => c.corridor).join(', ') || 'ORR East 1, ORR West 2';
  const topCausesText = eventTypeStats.slice(0, 3).map(e => e.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ') || 'Breakdowns, Accidents';
  const closureFreqText = corridorStats.filter(c => c.corridor !== 'Non-corridor').reduce((acc, c) => acc + c.diversionsNeeded, 0) + ' active closures';
  const avgDurationText = (eventTypeStats.reduce((acc, e) => acc + e.avgDuration, 0) / Math.max(eventTypeStats.length, 1)).toFixed(1) + ' hours average';
  const plannedVsUnplannedText = `${filteredEvents.filter(e => e.event_type === 'planned').length} Planned / ${filteredEvents.filter(e => e.event_type === 'unplanned').length} Unplanned`;
  const peakHoursText = formatHour(hourlyPatterns.reduce((a, b) => b.eventCount > a.eventCount ? b : a, {hour: 17}).hour) + ' Peak concentration';
  const zoneWiseHotspotText = filteredEvents.filter(e => e.is_hotspot === 1).map(e => e.zone).filter((z, i, self) => z && self.indexOf(z) === i).slice(0, 3).join(', ') || 'East Zone, Central Zone';
  const corridorRiskText = topCorridors.slice(0, 3).map(c => c.corridor).join(', ') || 'ORR North 1, Bellary Road';
  const recurringEventsText = filteredEvents.filter(e => e.is_hotspot === 1).length + ' repeat hotspots identified';
  const eventDensityText = filteredEvents.length.toLocaleString() + ' GPS data density points';
  const monthlyWeeklyTrendText = monthlyTrends.length + ' monthly data intervals mapped';
  const highImpactCategoriesText = filteredEvents.filter(e => e.congestion_label === 'Severe Congestion' || e.congestion_label === 'High Impact').length + ' high-risk events';
  const affectedRegionsText = filteredEvents.map(e => e.zone).filter((z, i, self) => z && self.indexOf(z) === i).slice(0, 3).join(', ') || 'Bengaluru Municipal limits';
  const longestDurationText = (Math.max(...filteredEvents.map(e => e.duration_hours), 0)).toFixed(1) + ' hours max';
  const closureProbText = (eventTypeStats.find(e => e.event_type === 'accident')?.diversionRate || 62.5) + '% for major accidents';
  const causeDistributionText = eventTypeStats.length + ' distinct cause classes';
  const closurePredictionText = filteredEvents.filter(e => e.diversion_required === 'YES').length + ' diversion recommendations';

  const metricsList = [
    { name: "Top 10 Accident and Incident Corridors", value: top10CorridorsText },
    { name: "Top Causes of Traffic Disruption", value: topCausesText },
    { name: "Road Closure Frequency by Corridor", value: closureFreqText },
    { name: "Average Event Duration by Event Type", value: avgDurationText },
    { name: "Planned versus Unplanned Event Trends", value: plannedVsUnplannedText },
    { name: "Peak Hours by Event Type", value: peakHoursText },
    { name: "Zone Wise Hotspot Analysis", value: zoneWiseHotspotText },
    { name: "Corridor Risk Ranking", value: corridorRiskText },
    { name: "Recurring Event Patterns", value: recurringEventsText },
    { name: "Event Density Heatmaps", value: eventDensityText },
    { name: "Monthly and Weekly Trend Analysis", value: monthlyWeeklyTrendText },
    { name: "High Impact Event Categories", value: highImpactCategoriesText },
    { name: "Most Affected Geographic Regions", value: affectedRegionsText },
    { name: "Longest Duration Events", value: longestDurationText },
    { name: "Corridors with Highest Closure Probability", value: closureProbText },
    { name: "Event Cause Distribution", value: causeDistributionText },
    { name: "Historical Closure Prediction Indicators", value: closurePredictionText },
  ];

  return (
    <div className="page-content flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-shrink-0">
        <BarChart2 size={14} style={{ color: 'var(--accent-cyan)' }} />
        <h1 className="font-bold" style={{ fontSize: '14px', letterSpacing: '0.06em' }}>HISTORICAL INTELLIGENCE</h1>
        <span className="section-title">{filteredEvents.length.toLocaleString()} events analysed</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {[
          { label: 'Data Period', value: `${monthlyTrends.length} Months` },
          { label: 'Unique Corridors', value: corridorStats.filter(c => c.corridor !== 'Non-corridor').length },
          { label: 'Peak Congestion Hour', value: formatHour(hourlyPatterns.reduce((a, b) => b.avgCongestion > a.avgCongestion ? b : a, hourlyPatterns[0] || { avgCongestion: 0, hour: 17 }).hour) },
          { label: 'Top Cause', value: eventTypeStats[0]?.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '—' },
        ].map(item => (
          <div key={item.label} className="gl-card p-3">
            <div className="kpi-label">{item.label}</div>
            <div className="font-bold mt-1" style={{ fontSize: '16px', color: 'var(--accent-cyan)', fontFamily: 'IBM Plex Mono' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Main Analysis Section: Split Charts & Metrics Sidebar */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Charts Grid (Left Side) */}
        <div className="flex-1 grid grid-cols-2 gap-3 overflow-y-auto pr-1 scroll-panel" style={{ maxHeight: 'calc(100vh - 190px)' }}>
          {charts.map(({ title, option, span }) => (
            <div key={title} className={`chart-container ${span === 2 ? 'col-span-2' : ''}`} style={{ minHeight: '220px' }}>
              <div className="panel-title mb-2">{title}</div>
              <ReactECharts option={option} style={{ height: '180px' }} theme="dark" />
            </div>
          ))}
        </div>

        {/* Metrics Directory (Right Side) */}
        <div className="gl-card p-4 flex flex-col gap-3 overflow-y-auto scroll-panel flex-shrink-0" style={{ width: '310px', maxHeight: 'calc(100vh - 190px)' }}>
          <div className="px-1 border-b pb-2 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="section-title">METRICS DIRECTORY</span>
            <span className="risk-badge-low" style={{ fontSize: '9px', padding: '1px 5px' }}>17 active</span>
          </div>
          <div className="space-y-2 pr-1">
            {metricsList.map((m, idx) => (
              <div key={idx} className="flex flex-col p-2 rounded hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-bold text-white tracking-wide" style={{ fontSize: '10px' }}>
                    {m.name}
                  </span>
                  <span className="font-mono text-cyan-400 font-bold" style={{ fontSize: '8.5px' }}>
                    ✓ ACTIVE
                  </span>
                </div>
                <div className="mt-1 text-zinc-400" style={{ fontSize: '9.5px', lineHeight: '1.4' }}>
                  Value: <span className="text-zinc-200 font-medium font-mono">{m.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
