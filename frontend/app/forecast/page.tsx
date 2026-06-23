'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { BrainCircuit, TrendingUp, Play } from 'lucide-react';
import { useGridLockedStore } from '@/lib/store';
import { formatHour, getCauseIcon } from '@/lib/utils';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

const DARK_CHART = {
  backgroundColor: 'transparent',
  textStyle: { color: '#64748B', fontFamily: 'IBM Plex Sans' },
};

export default function ForecastEngine() {
  const { hourlyPatterns, eventTypeStats, corridorStats, filteredEvents } = useGridLockedStore();
  const [forecastInput, setForecastInput] = useState({ cause: 'vehicle_breakdown', hour: 17, corridor: 'ORR North 1' });
  const [forecastResult, setForecastResult] = useState<any>(null);

  // Hourly congestion chart
  const hourlyOption = useMemo(() => ({
    ...DARK_CHART,
    grid: { top: 30, right: 16, bottom: 40, left: 48 },
    tooltip: { trigger: 'axis', backgroundColor: '#0D1B2A', borderColor: '#1E3A55', textStyle: { color: '#E2EAF4', fontSize: 11 } },
    legend: { top: 4, right: 0, textStyle: { color: '#64748B', fontSize: 10 } },
    xAxis: {
      type: 'category',
      data: hourlyPatterns.map(h => formatHour(h.hour)),
      axisLabel: { color: '#64748B', fontSize: 10 },
      axisLine: { lineStyle: { color: '#1E293B' } },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: '#64748B', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1E293B', type: 'dashed' } },
    },
    series: [
      {
        name: 'Avg Congestion',
        type: 'line',
        data: hourlyPatterns.map(h => h.avgCongestion),
        smooth: true,
        lineStyle: { color: '#06B6D4', width: 2 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(6,182,212,0.25)' }, { offset: 1, color: 'rgba(6,182,212,0.01)' }] } },
        itemStyle: { color: '#06B6D4' },
        symbol: 'none',
      },
      {
        name: 'Peak Congestion',
        type: 'line',
        data: hourlyPatterns.map(h => h.peakCongestion),
        smooth: true,
        lineStyle: { color: '#EF4444', width: 1.5, type: 'dashed' },
        itemStyle: { color: '#EF4444' },
        symbol: 'none',
      },
      {
        name: 'Event Count',
        type: 'bar',
        data: hourlyPatterns.map(h => h.eventCount),
        yAxisIndex: 1,
        barMaxWidth: 12,
        itemStyle: { color: 'rgba(245,158,11,0.4)', borderRadius: [2, 2, 0, 0] },
      },
    ],
    yAxis: [
      { type: 'value', max: 100, axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: { lineStyle: { color: '#1E293B', type: 'dashed' } } },
      { type: 'value', axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: { show: false } },
    ],
  }), [hourlyPatterns]);

  // Event Cause vs Congestion bar chart
  const causeOption = useMemo(() => ({
    ...DARK_CHART,
    grid: { top: 16, right: 80, bottom: 60, left: 140 },
    tooltip: { trigger: 'axis', backgroundColor: '#0D1B2A', borderColor: '#1E3A55', textStyle: { color: '#E2EAF4', fontSize: 11 } },
    xAxis: { type: 'value', axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: { lineStyle: { color: '#1E293B', type: 'dashed' } } },
    yAxis: {
      type: 'category',
      data: eventTypeStats.slice(0, 10).map(e => e.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
      axisLabel: { color: '#94A3B8', fontSize: 10 },
      axisLine: { lineStyle: { color: '#1E293B' } },
    },
    series: [
      {
        name: 'Avg Congestion',
        type: 'bar',
        data: eventTypeStats.slice(0, 10).map(e => e.avgCongestion),
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#0F3D66' }, { offset: 1, color: '#06B6D4' }] }, borderRadius: [0, 3, 3, 0] },
        barMaxWidth: 14,
        label: { show: true, position: 'right', color: '#64748B', fontSize: 10, formatter: '{c}' },
      },
      {
        name: 'Event Count',
        type: 'bar',
        data: eventTypeStats.slice(0, 10).map(e => e.count),
        itemStyle: { color: 'rgba(245,158,11,0.5)', borderRadius: [0, 3, 3, 0] },
        barMaxWidth: 10,
      },
    ],
  }), [eventTypeStats]);

  // Corridor risk heatmap (corridor × hour)
  const corridorData = useMemo(() => {
    const topCorridors = corridorStats.filter(c => c.corridor !== 'Non-corridor').slice(0, 8).map(c => c.corridor);
    const data: [number, number, number][] = [];
    for (let ci = 0; ci < topCorridors.length; ci++) {
      const corridor = topCorridors[ci];
      for (let h = 0; h < 24; h++) {
        const evs = filteredEvents.filter(e => e.corridor === corridor && e.event_hour === h);
        const score = evs.length > 0 ? evs.reduce((s, e) => s + e.congestion_risk_score, 0) / evs.length : 0;
        data.push([h, ci, Math.round(score)]);
      }
    }
    return { data, corridors: topCorridors };
  }, [corridorStats, filteredEvents]);

  const heatmapOption = useMemo(() => ({
    ...DARK_CHART,
    tooltip: { trigger: 'item', backgroundColor: '#0D1B2A', borderColor: '#1E3A55', textStyle: { color: '#E2EAF4', fontSize: 11 }, formatter: (p: any) => `${corridorData.corridors[p.data[1]]} @ ${formatHour(p.data[0])}: ${p.data[2]}` },
    grid: { top: 16, right: 100, bottom: 40, left: 130 },
    xAxis: { type: 'category', data: Array.from({ length: 24 }, (_, h) => formatHour(h)), axisLabel: { color: '#64748B', fontSize: 9 } },
    yAxis: { type: 'category', data: corridorData.corridors, axisLabel: { color: '#94A3B8', fontSize: 9 } },
    visualMap: { min: 0, max: 100, calculable: true, orient: 'vertical', right: 0, top: 'middle', textStyle: { color: '#64748B', fontSize: 9 }, inRange: { color: ['#0F3D66', '#1A5A8A', '#F59E0B', '#F97316', '#EF4444'] } },
    series: [{ type: 'heatmap', data: corridorData.data, itemStyle: { borderRadius: 1, borderColor: 'transparent', borderWidth: 1 } }],
  }), [corridorData]);

  // Run forecast simulation
  const runForecast = () => {
    const baseScore = forecastInput.hour >= 7 && forecastInput.hour <= 10 || forecastInput.hour >= 17 && forecastInput.hour <= 20 ? 70 : 45;
    const causeWeight: Record<string, number> = { accident: 25, tree_fall: 20, water_logging: 15, congestion: 18, vehicle_breakdown: 10, pot_holes: 8, construction: 12, public_event: 20, others: 5 };
    const score = Math.min(100, baseScore + (causeWeight[forecastInput.cause] || 10) + Math.random() * 10);
    const police = Math.ceil(score / 10);

    setForecastResult({
      score: Math.round(score),
      risk: score >= 75 ? 'Critical' : score >= 60 ? 'High' : score >= 45 ? 'Medium' : 'Low',
      delay: Math.round(score * 1.5),
      police,
      barricades: Math.ceil(police * 0.7),
      diversion: score >= 60,
      confidence: Math.round(82 + Math.random() * 12),
    });
  };

  return (
    <div className="page-content flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-shrink-0">
        <BrainCircuit size={14} style={{ color: 'var(--accent-cyan)' }} />
        <h1 className="font-bold" style={{ fontSize: '14px', letterSpacing: '0.06em' }}>FORECAST ENGINE</h1>
        <span className="section-title">Event-Driven Congestion Forecasting</span>
      </div>

      {/* Forecast Input Panel */}
      <div className="gl-card p-4 flex-shrink-0">
        <div className="section-title mb-3">LIVE FORECAST — INPUT PARAMETERS</div>
        <div className="grid grid-cols-4 gap-4 items-end">
          <div>
            <label className="section-title block mb-1.5">Event Cause</label>
            <select className="gl-select w-full" value={forecastInput.cause} onChange={(e) => setForecastInput(p => ({ ...p, cause: e.target.value }))}>
              {['vehicle_breakdown', 'accident', 'tree_fall', 'water_logging', 'congestion', 'pot_holes', 'construction', 'public_event', 'others'].map(c =>
                <option key={c} value={c}>{getCauseIcon(c)} {c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              )}
            </select>
          </div>
          <div>
            <label className="section-title block mb-1.5">Time of Day</label>
            <select className="gl-select w-full" value={forecastInput.hour} onChange={(e) => setForecastInput(p => ({ ...p, hour: +e.target.value }))}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{formatHour(h)}{(h >= 7 && h <= 10) || (h >= 17 && h <= 20) ? ' (Peak)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="section-title block mb-1.5">Corridor</label>
            <select className="gl-select w-full" value={forecastInput.corridor} onChange={(e) => setForecastInput(p => ({ ...p, corridor: e.target.value }))}>
              {corridorStats.filter(c => c.corridor !== 'Non-corridor').slice(0, 15).map(c => <option key={c.corridor}>{c.corridor}</option>)}
            </select>
          </div>
          <button className="gl-btn-primary" onClick={runForecast}>
            <Play size={12} /> Run Forecast
          </button>
        </div>

        {forecastResult && (
          <div className="mt-4 grid grid-cols-6 gap-3">
            {[
              { label: 'Congestion Score', value: forecastResult.score + '/100', color: forecastResult.score >= 75 ? '#EF4444' : forecastResult.score >= 60 ? '#F97316' : '#F59E0B' },
              { label: 'Risk Level', value: forecastResult.risk, color: forecastResult.risk === 'Critical' ? '#EF4444' : forecastResult.risk === 'High' ? '#F97316' : '#F59E0B' },
              { label: 'Expected Delay', value: forecastResult.delay + ' min', color: '#06B6D4' },
              { label: 'Police Required', value: forecastResult.police, color: '#F59E0B' },
              { label: 'Barricades', value: forecastResult.barricades, color: '#94A3B8' },
              { label: 'Diversion', value: forecastResult.diversion ? 'REQUIRED' : 'NOT NEEDED', color: forecastResult.diversion ? '#EF4444' : '#22C55E' },
            ].map(item => (
              <div key={item.label} className="text-center p-2 rounded" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.1)' }}>
                <div className="kpi-label">{item.label}</div>
                <div className="font-bold mt-1" style={{ fontSize: '16px', color: item.color, fontFamily: 'IBM Plex Mono' }}>{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        <div className="chart-container flex flex-col">
          <div className="panel-title mb-2 flex items-center gap-2">
            <TrendingUp size={12} style={{ color: 'var(--accent-cyan)' }} />
            Congestion by Hour of Day
          </div>
          <div className="flex-1" style={{ minHeight: '200px' }}>
            <ReactECharts option={hourlyOption} style={{ height: '100%' }} theme="dark" />
          </div>
        </div>

        <div className="chart-container flex flex-col">
          <div className="panel-title mb-2">Event Cause vs Congestion Score</div>
          <div className="flex-1" style={{ minHeight: '200px' }}>
            <ReactECharts option={causeOption} style={{ height: '100%' }} theme="dark" />
          </div>
        </div>

        <div className="chart-container col-span-2 flex flex-col">
          <div className="panel-title mb-2">Corridor × Hour Congestion Heatmap</div>
          <div className="flex-1" style={{ minHeight: '200px' }}>
            <ReactECharts option={heatmapOption} style={{ height: '100%' }} theme="dark" />
          </div>
        </div>
      </div>
    </div>
  );
}
