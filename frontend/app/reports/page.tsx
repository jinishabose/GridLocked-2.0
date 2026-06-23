'use client';
import React from 'react';
import { FileText, Download } from 'lucide-react';
import { useGridLockedStore } from '@/lib/store';

export default function Reports() {
  const { kpiMetrics, corridorStats, eventTypeStats, filteredEvents } = useGridLockedStore();

  const generateReport = (type: string) => {
    const lines: string[] = [
      `GridLocked — ${type}`,
      `Generated: ${new Date().toLocaleString('en-IN')}`,
      `Region: Bengaluru Metropolitan`,
      '─'.repeat(60),
      '',
      `Total Events: ${filteredEvents.length.toLocaleString()}`,
      `Active Events: ${kpiMetrics?.activeEvents ?? 0}`,
      `High Risk Events: ${kpiMetrics?.highRiskEvents ?? 0}`,
      `Congestion Score: ${kpiMetrics?.predictedCongestionScore ?? 0}/100`,
      `Recommended Officers: ${kpiMetrics?.recommendedOfficers ?? 0}`,
      `Road Closures: ${kpiMetrics?.roadClosures ?? 0}`,
      '',
      'TOP CORRIDORS BY CONGESTION:',
      ...corridorStats.filter(c => c.corridor !== 'Non-corridor').slice(0, 5).map((c, i) =>
        `  ${i + 1}. ${c.corridor} — Score: ${c.avgCongestionScore} (${c.eventCount} events)`
      ),
      '',
      'TOP EVENT CAUSES:',
      ...eventTypeStats.slice(0, 5).map((e, i) =>
        `  ${i + 1}. ${e.event_type.replace(/_/g, ' ')} — ${e.count} events, Avg Score: ${e.avgCongestion}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `gridlocked_${type.toLowerCase().replace(/ /g, '_')}.txt`; a.click();
  };

  const REPORT_TYPES = [
    { title: 'Daily Operations Report', desc: 'Active events, deployments, and incident summary', type: 'Daily Operations Report' },
    { title: 'Weekly Summary Report', desc: 'Week-over-week trends, top incidents, and resource utilization', type: 'Weekly Summary' },
    { title: 'Event Post-Mortem Report', desc: 'Detailed analysis of resolved events with lessons learned', type: 'Event Post Mortem' },
    { title: 'Resource Utilization Report', desc: 'Officer deployment efficiency, gaps, and recommendations', type: 'Resource Utilization Report' },
    { title: 'Corridor Risk Assessment', desc: 'Risk scores, event density, and deployment needs by corridor', type: 'Corridor Risk Assessment' },
    { title: 'Executive Intelligence Brief', desc: 'High-level summary for command leadership', type: 'Executive Intelligence Brief' },
  ];

  return (
    <div className="page-content flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-shrink-0">
        <FileText size={14} style={{ color: 'var(--accent-cyan)' }} />
        <h1 className="font-bold" style={{ fontSize: '14px', letterSpacing: '0.06em' }}>REPORTS</h1>
        <span className="section-title">Intelligence Report Generator</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {REPORT_TYPES.map((r) => (
          <div key={r.title} className="gl-card p-4 flex flex-col gap-3">
            <div>
              <div className="panel-title">{r.title}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{r.desc}</div>
            </div>
            <button className="gl-btn-secondary gap-2 self-start" onClick={() => generateReport(r.type)}>
              <Download size={12} /> Generate & Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
