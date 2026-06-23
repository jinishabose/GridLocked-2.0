'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useGridLockedStore } from '@/lib/store';
import { truncateAddress, formatDateTime, getCauseIcon, formatDuration } from '@/lib/utils';
import type { TrafficEvent } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_SIZE = 50;

const CAUSES = ['all', 'vehicle_breakdown', 'accident', 'tree_fall', 'water_logging', 'congestion', 'pot_holes', 'construction', 'public_event', 'road_conditions', 'others'];

export default function EventDashboard() {
  const { filteredEvents, filters, setFilter, resetFilters, corridorStats } = useGridLockedStore();
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<keyof TrafficEvent>('congestion_risk_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const corridors = useMemo(() => ['all', ...Array.from(new Set(filteredEvents.map(e => e.corridor).filter(c => c !== 'Non-corridor')))].slice(0, 30), [filteredEvents]);
  const zones = useMemo(() => ['all', ...Array.from(new Set(filteredEvents.map(e => e.zone).filter(Boolean)))].slice(0, 20), [filteredEvents]);

  const sorted = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const av = a[sortKey] as any, bv = b[sortKey] as any;
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'desc' ? bv - av : av - bv;
      return sortDir === 'desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  }, [filteredEvents, sortKey, sortDir]);

  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const handleSort = (key: keyof TrafficEvent) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ col }: { col: keyof TrafficEvent }) =>
    sortKey === col ? (sortDir === 'desc' ? <ChevronDown size={10} /> : <ChevronUp size={10} />) : null;

  const downloadCSV = () => {
    const headers = ['id', 'event_type', 'event_cause', 'status', 'address', 'corridor', 'congestion_risk_score', 'congestion_label', 'recommended_police', 'decision_priority'];
    const rows = sorted.map(e => headers.map(h => (e as any)[h]).join(','));
    const blob = new Blob([headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gridlocked_events.csv'; a.click();
  };

  return (
    <div className="page-content flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-bold" style={{ fontSize: '14px', letterSpacing: '0.06em' }}>EVENT DASHBOARD</h1>
          <div className="section-title mt-0.5">{sorted.length.toLocaleString()} events · Page {page + 1}/{totalPages}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetFilters} className="gl-btn-secondary gap-1"><X size={12} /> Reset</button>
          <button onClick={downloadCSV} className="gl-btn-secondary gap-1"><Download size={12} /> Export</button>
        </div>
      </div>

      {/* Filters */}
      <div className="gl-card p-3 flex-shrink-0">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="flex items-center gap-2 gl-input" style={{ minWidth: '200px' }}>
            <Search size={12} style={{ color: 'var(--text-muted)' }} />
            <input
              className="bg-transparent border-none outline-none flex-1 text-xs"
              placeholder="Search ID, location, corridor…"
              style={{ color: 'var(--text-primary)' }}
              value={filters.searchQuery}
              onChange={(e) => setFilter('searchQuery', e.target.value)}
            />
          </div>

          {/* Status */}
          <select className="gl-select" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Risk Level */}
          <select className="gl-select" value={filters.riskLevel} onChange={(e) => setFilter('riskLevel', e.target.value)}>
            <option value="all">All Risk Levels</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Event Type */}
          <select className="gl-select" value={filters.eventType} onChange={(e) => setFilter('eventType', e.target.value)}>
            <option value="all">Planned + Unplanned</option>
            <option value="planned">Planned</option>
            <option value="unplanned">Unplanned</option>
          </select>

          {/* Cause */}
          <select className="gl-select" value={filters.cause} onChange={(e) => setFilter('cause', e.target.value)}>
            {CAUSES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Causes' : c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
          </select>

          {/* Corridor */}
          <select className="gl-select" value={filters.corridor} onChange={(e) => setFilter('corridor', e.target.value)}>
            {corridors.map(c => <option key={c} value={c}>{c === 'all' ? 'All Corridors' : c}</option>)}
          </select>

          {/* Zone */}
          <select className="gl-select" value={filters.zone} onChange={(e) => setFilter('zone', e.target.value)}>
            {zones.map(z => <option key={z || 'all'} value={z || 'all'}>{!z || z === 'all' ? 'All Zones' : z}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="gl-card flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 scroll-panel">
          <table className="gl-table">
            <thead>
              <tr>
                {[
                  { key: 'id', label: 'EVENT ID' },
                  { key: 'event_cause', label: 'CAUSE' },
                  { key: 'address', label: 'LOCATION' },
                  { key: 'corridor', label: 'CORRIDOR' },
                  { key: 'status', label: 'STATUS' },
                  { key: 'congestion_risk_score', label: 'SCORE' },
                  { key: 'congestion_label', label: 'RISK' },
                  { key: 'recommended_police', label: 'POLICE' },
                  { key: 'decision_priority', label: 'PRIORITY' },
                  { key: 'duration_hours', label: 'DURATION' },
                  { key: 'start_datetime', label: 'START' },
                ].map(({ key, label }) => (
                  <th key={key} onClick={() => handleSort(key as keyof TrafficEvent)}
                    className="cursor-pointer hover:text-white select-none whitespace-nowrap">
                    <span className="flex items-center gap-1">{label} <SortIcon col={key as keyof TrafficEvent} /></span>
                  </th>
                ))}
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((ev) => (
                <React.Fragment key={ev.id}>
                  <tr
                    className="cursor-pointer"
                    onClick={() => setExpandedId(expandedId === ev.id ? null : ev.id)}
                    style={expandedId === ev.id ? { background: 'rgba(6,182,212,0.05)' } : undefined}
                  >
                    <td className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ev.id}</td>
                    <td>
                      <span className="flex items-center gap-1">
                        <span>{getCauseIcon(ev.event_cause)}</span>
                        <span style={{ fontSize: '11px' }}>{ev.event_cause.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      </span>
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <span className="block truncate" style={{ fontSize: '10px' }}>{truncateAddress(ev.address, 40)}</span>
                    </td>
                    <td style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{ev.corridor}</td>
                    <td><span className={`status-${ev.status}`}>{ev.status}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="gl-progress w-12">
                          <div className="gl-progress-fill" style={{
                            width: `${ev.congestion_risk_score}%`,
                            background: ev.congestion_risk_score >= 75 ? '#EF4444' : ev.congestion_risk_score >= 60 ? '#F97316' : '#F59E0B'
                          }} />
                        </div>
                        <span className="font-mono" style={{ fontSize: '10px' }}>{ev.congestion_risk_score.toFixed(1)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`risk-badge-${ev.zone_risk_level === 'CRITICAL' ? 'critical' : ev.zone_risk_level === 'HIGH' ? 'high' : ev.zone_risk_level === 'MEDIUM' ? 'medium' : 'low'}`}>
                        {ev.congestion_label}
                      </span>
                    </td>
                    <td className="font-mono text-center" style={{ fontSize: '11px' }}>{ev.recommended_police}</td>
                    <td>
                      <span className={`risk-badge-${ev.decision_priority === 'URGENT' ? 'critical' : ev.decision_priority === 'HIGH' ? 'high' : ev.decision_priority === 'MEDIUM' ? 'medium' : 'low'}`}>
                        {ev.decision_priority}
                      </span>
                    </td>
                    <td className="font-mono" style={{ fontSize: '10px' }}>{formatDuration(ev.duration_hours)}</td>
                    <td style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {ev.start_datetime ? formatDateTime(ev.start_datetime) : '—'}
                    </td>
                    <td>
                      <button className="gl-btn-secondary" style={{ padding: '2px 8px', fontSize: '10px' }}>
                        {expandedId === ev.id ? 'Less' : 'Details'}
                      </button>
                    </td>
                  </tr>
                  <AnimatePresence>
                    {expandedId === ev.id && (
                      <tr>
                        <td colSpan={12} style={{ padding: 0 }}>
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="px-4 py-3 grid grid-cols-4 gap-4"
                              style={{ background: 'rgba(6,182,212,0.03)', borderTop: '1px solid rgba(6,182,212,0.1)' }}>
                              <div>
                                <div className="section-title mb-2">EVENT DETAILS</div>
                                <div className="space-y-1" style={{ fontSize: '11px' }}>
                                  <div><span style={{ color: 'var(--text-muted)' }}>Type:</span> <span>{ev.event_type}</span></div>
                                  <div><span style={{ color: 'var(--text-muted)' }}>Vehicle:</span> <span>{ev.veh_type || '—'}</span></div>
                                  <div><span style={{ color: 'var(--text-muted)' }}>Zone:</span> <span>{ev.zone || '—'}</span></div>
                                  <div><span style={{ color: 'var(--text-muted)' }}>Junction:</span> <span>{ev.junction || '—'}</span></div>
                                  <div><span style={{ color: 'var(--text-muted)' }}>Hotspot:</span> <span>{ev.is_hotspot ? 'YES' : 'NO'}</span></div>
                                  <div><span style={{ color: 'var(--text-muted)' }}>Peak Hour:</span> <span>{ev.is_peak_hour ? 'YES' : 'NO'}</span></div>
                                </div>
                              </div>
                              <div>
                                <div className="section-title mb-2">LOCATION</div>
                                <div className="space-y-1" style={{ fontSize: '11px' }}>
                                  <div><span style={{ color: 'var(--text-muted)' }}>Address:</span> <span style={{ fontSize: '10px' }}>{ev.address}</span></div>
                                  <div><span style={{ color: 'var(--text-muted)' }}>Lat/Lng:</span> <span className="font-mono" style={{ fontSize: '10px' }}>{ev.latitude.toFixed(5)}, {ev.longitude.toFixed(5)}</span></div>
                                  <div><span style={{ color: 'var(--text-muted)' }}>Police Station:</span> <span>{ev.police_station || '—'}</span></div>
                                </div>
                              </div>
                              <div>
                                <div className="section-title mb-2">RESOURCES</div>
                                <div className="space-y-1" style={{ fontSize: '11px' }}>
                                  <div><span style={{ color: 'var(--text-muted)' }}>Officers:</span> <span style={{ color: '#F59E0B', fontWeight: 600 }}>{ev.recommended_police}</span></div>
                                  <div><span style={{ color: 'var(--text-muted)' }}>Barricades:</span> <span>{ev.recommended_barricades}</span></div>
                                  <div><span style={{ color: 'var(--text-muted)' }}>Diversion:</span> <span style={{ color: ev.diversion_required === 'YES' ? '#EF4444' : '#22C55E' }}>{ev.diversion_required}</span></div>
                                  <div><span style={{ color: 'var(--text-muted)' }}>Impact Radius:</span> <span>{ev.impact_radius_m}m</span></div>
                                  <div><span style={{ color: 'var(--text-muted)' }}>Closure:</span> <span>{ev.requires_road_closure ? 'YES' : 'NO'}</span></div>
                                </div>
                              </div>
                              <div>
                                <div className="section-title mb-2">AI ANALYSIS</div>
                                <div className="space-y-1" style={{ fontSize: '11px' }}>
                                  <div style={{ color: 'var(--text-primary)' }}>{ev.alert_description}</div>
                                  <div className="mt-2 p-2 rounded" style={{ background: 'rgba(6,182,212,0.08)', fontSize: '10px', color: 'var(--accent-cyan)' }}>
                                    {ev.recommended_action}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <button className="gl-btn-secondary" style={{ padding: '3px 10px', fontSize: '11px' }} onClick={() => setPage(0)} disabled={page === 0}>«</button>
            <button className="gl-btn-secondary" style={{ padding: '3px 10px', fontSize: '11px' }} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹</button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pg = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <button key={pg} className={pg === page ? 'gl-btn-primary' : 'gl-btn-secondary'}
                  style={{ padding: '3px 8px', fontSize: '11px' }} onClick={() => setPage(pg)}>
                  {pg + 1}
                </button>
              );
            })}
            <button className="gl-btn-secondary" style={{ padding: '3px 10px', fontSize: '11px' }} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>›</button>
            <button className="gl-btn-secondary" style={{ padding: '3px 10px', fontSize: '11px' }} onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>»</button>
          </div>
        </div>
      </div>
    </div>
  );
}
