'use client';

import React from 'react';
import { Users, AlertTriangle, Shield, Truck, Cone, ArrowLeftRight } from 'lucide-react';
import { useGridLockedStore } from '@/lib/store';

export default function ResourcePlanner() {
  const { resourcePlan, kpiMetrics, corridorStats } = useGridLockedStore();

  const totalRequired = resourcePlan.reduce((s, r) => s + r.requiredPolice, 0);
  const totalAvailable = resourcePlan.reduce((s, r) => s + r.availablePolice, 0);
  const totalGap = resourcePlan.reduce((s, r) => s + r.policeGap, 0);
  const totalBarricades = resourcePlan.reduce((s, r) => s + r.requiredBarricades, 0);
  const totalCones = resourcePlan.reduce((s, r) => s + r.requiredCones, 0);
  const totalTows = resourcePlan.reduce((s, r) => s + r.requiredTowTrucks, 0);
  const totalDivTeams = resourcePlan.reduce((s, r) => s + r.diversionTeams, 0);

  return (
    <div className="page-content flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Users size={14} style={{ color: 'var(--accent-cyan)' }} />
        <h1 className="font-bold" style={{ fontSize: '14px', letterSpacing: '0.06em' }}>RESOURCE PLANNER</h1>
        <span className="section-title">Deployment Allocation & Gap Analysis</span>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-5 gap-3 flex-shrink-0">
        {[
          { label: 'Officers Required', value: totalRequired, icon: <Shield size={14} />, color: '#F59E0B' },
          { label: 'Officers Available', value: totalAvailable, icon: <Shield size={14} />, color: '#22C55E' },
          { label: 'Deployment Gap', value: totalGap, icon: <AlertTriangle size={14} />, color: '#EF4444' },
          { label: 'Barricades Needed', value: totalBarricades, icon: <Users size={14} />, color: '#06B6D4' },
          { label: 'Diversion Teams', value: totalDivTeams, icon: <ArrowLeftRight size={14} />, color: '#94A3B8' },
        ].map(item => (
          <div key={item.label} className="kpi-card" style={{ '--kpi-accent': item.color } as any}>
            <div className="flex items-center justify-between mb-1">
              <span className="kpi-label">{item.label}</span>
              <span style={{ color: item.color, opacity: 0.7 }}>{item.icon}</span>
            </div>
            <div className="kpi-value" style={{ fontSize: '24px', color: item.color }}>{item.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Deployment Gap Alert */}
      {totalGap > 0 && (
        <div className="flex-shrink-0 p-3 rounded flex items-start gap-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle size={14} style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div className="font-semibold" style={{ fontSize: '12px', color: '#EF4444' }}>
              Critical Deployment Gap Detected — {totalGap} Officers Understaffed
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
              {resourcePlan.filter(r => r.policeGap > 0).length} corridors have insufficient officer deployment. Immediate resource reallocation recommended.
            </div>
          </div>
        </div>
      )}

      {/* Main Resource Table */}
      <div className="gl-card flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <span className="panel-title">Corridor Resource Allocation</span>
          <span className="section-title">{resourcePlan.length} corridors</span>
        </div>
        <div className="overflow-auto scroll-panel flex-1">
          <table className="gl-table">
            <thead>
              <tr>
                <th>CORRIDOR</th>
                <th>PRIORITY</th>
                <th>REQ OFFICERS</th>
                <th>AVAIL OFFICERS</th>
                <th>GAP</th>
                <th>BARRICADES</th>
                <th>CONES</th>
                <th>TOW TRUCKS</th>
                <th>DIV TEAMS</th>
                <th>UTILIZATION</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {resourcePlan.map((row) => {
                const utilization = row.requiredPolice > 0 ? Math.round((row.availablePolice / row.requiredPolice) * 100) : 100;
                const hasGap = row.policeGap > 0;
                return (
                  <tr key={row.corridor} style={hasGap ? { background: 'rgba(239,68,68,0.03)' } : undefined}>
                    <td className="font-medium" style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{row.corridor}</td>
                    <td>
                      <span className={`risk-badge-${row.priority === 'URGENT' ? 'critical' : row.priority === 'HIGH' ? 'high' : row.priority === 'MEDIUM' ? 'medium' : 'low'}`}>
                        {row.priority}
                      </span>
                    </td>
                    <td className="font-mono text-center" style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 600 }}>{row.requiredPolice}</td>
                    <td className="font-mono text-center" style={{ fontSize: '12px', color: '#22C55E' }}>{row.availablePolice}</td>
                    <td className="font-mono text-center">
                      <span style={{ fontSize: '12px', color: row.policeGap > 0 ? '#EF4444' : '#22C55E', fontWeight: 600 }}>
                        {row.policeGap > 0 ? `-${row.policeGap}` : '✓'}
                      </span>
                    </td>
                    <td className="font-mono text-center" style={{ fontSize: '11px' }}>{row.requiredBarricades}</td>
                    <td className="font-mono text-center" style={{ fontSize: '11px' }}>{row.requiredCones}</td>
                    <td className="font-mono text-center" style={{ fontSize: '11px' }}>{row.requiredTowTrucks}</td>
                    <td className="font-mono text-center" style={{ fontSize: '11px' }}>{row.diversionTeams}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="gl-progress flex-1" style={{ height: '5px' }}>
                          <div className="gl-progress-fill" style={{
                            width: `${Math.min(100, utilization)}%`,
                            background: utilization >= 90 ? '#22C55E' : utilization >= 60 ? '#F59E0B' : '#EF4444'
                          }} />
                        </div>
                        <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)', width: '30px', textAlign: 'right' }}>{utilization}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={hasGap ? 'risk-badge-critical' : 'risk-badge-low'}>
                        {hasGap ? 'UNDERSTAFFED' : 'ADEQUATE'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resource Summary Cards */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {[
          { label: 'Traffic Cones', value: totalCones, icon: '🚧', desc: 'For lane demarcation' },
          { label: 'Tow Trucks', value: totalTows, icon: '🚚', desc: 'Vehicle removal' },
          { label: 'Total Barricades', value: totalBarricades, icon: '🚧', desc: 'Road closure barriers' },
          { label: 'Diversion Teams', value: totalDivTeams, icon: '🔀', desc: 'Route management' },
        ].map(item => (
          <div key={item.label} className="gl-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <div>
                <div className="panel-title">{item.label}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
            </div>
            <div className="kpi-value" style={{ fontSize: '26px', color: 'var(--accent-cyan)' }}>{item.value.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
