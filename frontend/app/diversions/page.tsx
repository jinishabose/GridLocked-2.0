'use client';
import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { useGridLockedStore } from '@/lib/store';
import { truncateAddress } from '@/lib/utils';

export default function DiversionPlanner() {
  const { filteredEvents } = useGridLockedStore();
  const [activated, setActivated] = useState<Set<string>>(new Set());

  const diversionEvents = useMemo(() =>
    filteredEvents.filter(e => e.diversion_required === 'YES').slice(0, 80),
    [filteredEvents]
  );

  const DIVERSION_ROUTES: Record<string, string> = {
    'ORR North 1': 'Via Hebbal Flyover → Bellary Road → Nagawara',
    'ORR North 2': 'Via Yeshwanthpur → Chord Road → Tumkur Road',
    'ORR East 1': 'Via Old Madras Road → ITPL Road → Marathahalli',
    'ORR East 2': 'Via Whitefield Road → KR Pura → Hosur Road',
    'Bellary Road 1': 'Via Mehkri Circle → Palace Road → Tumkur Road',
    'Bellary Road 2': 'Via Hebbal → Thanisandra → ORR',
    'Hosur Road': 'Via Dairy Circle → BTM Layout → Silk Board',
    'Mysore Road': 'Via Nayandahalli → Kengeri → Bannerghata Road',
    'Tumkur Road': 'Via Peenya → Chord Road → Rajajinagar',
    'Bannerghata Road': 'Via JP Nagar → Jayanagar → Silk Board',
    'default': 'Use alternate internal roads via nearest junction',
  };

  const getRoute = (corridor: string) => DIVERSION_ROUTES[corridor] || DIVERSION_ROUTES.default;

  const urgentDiversions = diversionEvents.filter(e => e.diversion_priority === 'CRITICAL');
  const highDiversions = diversionEvents.filter(e => e.diversion_priority === 'HIGH');

  return (
    <div className="page-content flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-shrink-0">
        <ArrowLeftRight size={14} style={{ color: 'var(--accent-cyan)' }} />
        <h1 className="font-bold" style={{ fontSize: '14px', letterSpacing: '0.06em' }}>DIVERSION PLANNER</h1>
        <span className="section-title">{diversionEvents.length} active diversions required</span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {[
          { label: 'Total Diversions', value: diversionEvents.length, color: '#06B6D4' },
          { label: 'CRITICAL Priority', value: urgentDiversions.length, color: '#EF4444' },
          { label: 'HIGH Priority', value: highDiversions.length, color: '#F97316' },
          { label: 'Activated', value: activated.size, color: '#22C55E' },
        ].map(item => (
          <div key={item.label} className="kpi-card" style={{ '--kpi-accent': item.color } as any}>
            <div className="kpi-label">{item.label}</div>
            <div className="kpi-value" style={{ fontSize: '26px', color: item.color, marginTop: '4px' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Diversion Table */}
      <div className="gl-card flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="panel-title">Diversion Routes — Priority Queue</span>
        </div>
        <div className="overflow-auto scroll-panel flex-1">
          <table className="gl-table">
            <thead>
              <tr>
                <th>EVENT ID</th>
                <th>CAUSE</th>
                <th>ORIGIN LOCATION</th>
                <th>CORRIDOR</th>
                <th>PRIORITY</th>
                <th>DIVERSION ROUTE</th>
                <th>EST. DELAY</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {diversionEvents.map((ev) => {
                const isActivated = activated.has(ev.id);
                const delay = Math.round(ev.congestion_risk_score * 1.2);
                return (
                  <tr key={ev.id} style={isActivated ? { background: 'rgba(34,197,94,0.04)' } : undefined}>
                    <td className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ev.id}</td>
                    <td style={{ fontSize: '11px' }}>{ev.event_cause.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                    <td style={{ maxWidth: '180px' }}>
                      <div className="flex items-start gap-1">
                        <MapPin size={10} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />
                        <span className="truncate" style={{ fontSize: '10px' }}>{truncateAddress(ev.address, 35)}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{ev.corridor}</td>
                    <td>
                      <span className={`risk-badge-${ev.diversion_priority === 'CRITICAL' ? 'critical' : ev.diversion_priority === 'HIGH' ? 'high' : 'medium'}`}>
                        {ev.diversion_priority}
                      </span>
                    </td>
                    <td style={{ fontSize: '10px', color: 'var(--accent-cyan)', maxWidth: '220px' }}>
                      <span className="block truncate">{getRoute(ev.corridor)}</span>
                    </td>
                    <td className="font-mono" style={{ fontSize: '11px', color: '#F59E0B' }}>{delay} min</td>
                    <td>
                      <span className={isActivated ? 'status-active' : 'status-closed'}>
                        {isActivated ? 'ACTIVE' : 'PENDING'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={isActivated ? 'gl-btn-secondary' : 'gl-btn-primary'}
                        style={{ padding: '3px 10px', fontSize: '10px', gap: '4px' }}
                        onClick={() => {
                          const newSet = new Set(activated);
                          if (isActivated) newSet.delete(ev.id); else newSet.add(ev.id);
                          setActivated(newSet);
                        }}
                      >
                        {isActivated ? <><XCircle size={10} /> Deactivate</> : <><CheckCircle size={10} /> Activate</>}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
