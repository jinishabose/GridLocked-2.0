'use client';
import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, TrendingUp, TrendingDown } from 'lucide-react';
import { useGridLockedStore } from '@/lib/store';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });
const DARK = { backgroundColor: 'transparent', textStyle: { color: '#64748B', fontFamily: 'IBM Plex Sans' } };
const TOOLTIP = { backgroundColor: '#0D1B2A', borderColor: '#1E3A55', textStyle: { color: '#E2EAF4', fontSize: 11 } };
const SPLIT = { lineStyle: { color: '#1E293B', type: 'dashed' } };

export default function PostEventLearning() {
  const { postEventData } = useGridLockedStore();

  // Predicted vs actual congestion scatter
  const scatterOption = useMemo(() => ({
    ...DARK,
    grid: { top: 30, right: 30, bottom: 40, left: 50 },
    tooltip: { trigger: 'item', ...TOOLTIP, formatter: (p: any) => `Predicted: ${p.data[0]}<br/>Actual: ${p.data[1]}<br/>${postEventData[p.dataIndex]?.eventType || ''}` },
    xAxis: { type: 'value', name: 'Predicted', nameTextStyle: { color: '#64748B' }, axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: SPLIT, min: 0, max: 100 },
    yAxis: { type: 'value', name: 'Actual', nameTextStyle: { color: '#64748B' }, axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: SPLIT, min: 0, max: 100 },
    series: [
      {
        name: 'Events',
        type: 'scatter',
        data: postEventData.slice(0, 100).map(e => [e.predictedCongestion, e.actualCongestion]),
        itemStyle: {
          color: (p: any) => {
            const diff = Math.abs(p.data[1] - p.data[0]);
            return diff > 15 ? '#EF4444' : diff > 8 ? '#F59E0B' : '#22C55E';
          },
          opacity: 0.75,
        },
        symbolSize: 7,
      },
      {
        name: 'Perfect Prediction',
        type: 'line',
        data: [[0, 0], [100, 100]],
        lineStyle: { color: 'rgba(6,182,212,0.3)', type: 'dashed', width: 1 },
        symbol: 'none',
        z: 0,
      },
    ],
  }), [postEventData]);

  // Police comparison bar
  const policeCompOption = useMemo(() => ({
    ...DARK,
    grid: { top: 30, right: 20, bottom: 60, left: 60 },
    tooltip: { trigger: 'axis', ...TOOLTIP },
    legend: { top: 4, right: 0, textStyle: { color: '#64748B', fontSize: 10 } },
    xAxis: { type: 'category', data: postEventData.slice(0, 20).map(e => e.eventType.replace(/_/g, ' ')), axisLabel: { color: '#64748B', fontSize: 9, rotate: 35 } },
    yAxis: { type: 'value', axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: SPLIT },
    series: [
      { name: 'Predicted Officers', type: 'bar', data: postEventData.slice(0, 20).map(e => e.predictedPolice), itemStyle: { color: 'rgba(6,182,212,0.7)', borderRadius: [2, 2, 0, 0] }, barMaxWidth: 20 },
      { name: 'Actual Officers', type: 'bar', data: postEventData.slice(0, 20).map(e => e.actualPolice), itemStyle: { color: 'rgba(245,158,11,0.7)', borderRadius: [2, 2, 0, 0] }, barMaxWidth: 20 },
    ],
  }), [postEventData]);

  // Accuracy metrics
  const withData = postEventData.slice(0, 100);
  const mape = withData.length > 0 ? withData.reduce((s, e) => s + Math.abs((e.actualCongestion - e.predictedCongestion) / Math.max(e.predictedCongestion, 1)), 0) / withData.length * 100 : 0;
  const within10 = withData.filter(e => Math.abs(e.actualCongestion - e.predictedCongestion) <= 10).length;
  const accuracy = withData.length > 0 ? Math.round((within10 / withData.length) * 100) : 0;
  const diversionHit = withData.filter(e => e.diversionRecommended === e.diversionActivated).length;
  const divAccuracy = withData.length > 0 ? Math.round((diversionHit / withData.length) * 100) : 0;

  // Unique lessons
  const lessonCounts: Record<string, number> = {};
  postEventData.forEach(e => { lessonCounts[e.lesson] = (lessonCounts[e.lesson] || 0) + 1; });
  const lessons = Object.entries(lessonCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="page-content flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-shrink-0">
        <BookOpen size={14} style={{ color: 'var(--accent-cyan)' }} />
        <h1 className="font-bold" style={{ fontSize: '14px', letterSpacing: '0.06em' }}>POST EVENT LEARNING</h1>
        <span className="section-title">{postEventData.length} events analysed</span>
      </div>

      {/* Model Accuracy KPIs */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {[
          { label: 'Congestion MAPE', value: `${mape.toFixed(1)}%`, color: mape < 15 ? '#22C55E' : mape < 25 ? '#F59E0B' : '#EF4444', desc: 'Mean Absolute % Error' },
          { label: 'Prediction Accuracy', value: `${accuracy}%`, color: accuracy >= 80 ? '#22C55E' : accuracy >= 65 ? '#F59E0B' : '#EF4444', desc: 'Within ±10 score band' },
          { label: 'Diversion Accuracy', value: `${divAccuracy}%`, color: divAccuracy >= 75 ? '#22C55E' : '#F59E0B', desc: 'Rec vs Activated match' },
          { label: 'Events Analysed', value: postEventData.length, color: '#06B6D4', desc: 'Post-event records' },
        ].map(item => (
          <div key={item.label} className="kpi-card" style={{ '--kpi-accent': item.color } as any}>
            <div className="kpi-label">{item.label}</div>
            <div className="kpi-value" style={{ fontSize: '24px', color: item.color, marginTop: '4px' }}>{item.value}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="chart-container" style={{ minHeight: '240px' }}>
          <div className="panel-title mb-1">Predicted vs Actual Congestion</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#22C55E' }} />Within ±10</span>
            <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#F59E0B' }} />±10–15</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#EF4444' }} />&gt;15 deviation</span>
          </div>
          <ReactECharts option={scatterOption} style={{ height: '185px' }} theme="dark" />
        </div>
        <div className="chart-container" style={{ minHeight: '240px' }}>
          <div className="panel-title mb-2">Predicted vs Actual Police Deployment</div>
          <ReactECharts option={policeCompOption} style={{ height: '200px' }} theme="dark" />
        </div>
      </div>

      {/* Lessons Learned */}
      <div className="gl-card flex-shrink-0">
        <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <BookOpen size={12} style={{ color: 'var(--accent-cyan)' }} />
          <span className="panel-title">AUTO-GENERATED LESSONS LEARNED</span>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          {lessons.map(([lesson, count], i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded"
              style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.08)' }}>
              <span className="font-bold flex-shrink-0" style={{ fontSize: '16px', color: 'var(--accent-cyan)', fontFamily: 'IBM Plex Mono', marginTop: '-2px' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1">
                <div style={{ fontSize: '11px', color: 'var(--text-primary)', lineHeight: '1.4' }}>{lesson}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Observed in {count} event{count > 1 ? 's' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
