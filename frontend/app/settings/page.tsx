'use client';
import React from 'react';
import { Settings, Key, MapPin, Bell, RefreshCw, Save } from 'lucide-react';
import { useGridLockedStore } from '@/lib/store';

export default function SettingsPage() {
  const { settings, updateSettings } = useGridLockedStore();

  return (
    <div className="page-content flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Settings size={14} style={{ color: 'var(--accent-cyan)' }} />
        <h1 className="font-bold" style={{ fontSize: '14px', letterSpacing: '0.06em' }}>SETTINGS</h1>
        <span className="section-title">Platform Configuration</span>
      </div>

      <div className="grid grid-cols-2 gap-4" style={{ maxWidth: '800px' }}>
        {/* Map API Key */}
        <div className="gl-card p-4 col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Key size={12} style={{ color: 'var(--accent-cyan)' }} />
            <span className="panel-title">Mappls API Key</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Get your API key at <a href="https://auth.mappls.com/console" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)' }}>auth.mappls.com/console</a>. 
            Without a key, the platform uses the canvas-based map preview.
          </div>
          <div className="flex gap-2">
            <input
              className="gl-input flex-1"
              type="password"
              placeholder="Enter your Mappls API key…"
              value={settings.mapplsApiKey}
              onChange={(e) => updateSettings({ mapplsApiKey: e.target.value })}
            />
            <button className="gl-btn-primary gap-1">
              <Save size={12} /> Save Key
            </button>
          </div>
          {settings.mapplsApiKey && (
            <div className="mt-2 flex items-center gap-1" style={{ fontSize: '11px', color: '#22C55E' }}>
              ✓ API key configured — Live Mappls map will activate on next load
            </div>
          )}
        </div>

        {/* Region */}
        <div className="gl-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={12} style={{ color: 'var(--accent-cyan)' }} />
            <span className="panel-title">Default Region</span>
          </div>
          <select className="gl-select w-full" value={settings.region} onChange={(e) => updateSettings({ region: e.target.value })}>
            {['Bengaluru', 'Delhi NCR', 'Mumbai', 'Hyderabad', 'Chennai', 'All India'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        {/* Auto Refresh */}
        <div className="gl-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw size={12} style={{ color: 'var(--accent-cyan)' }} />
            <span className="panel-title">Auto Refresh</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className="relative w-9 h-5 rounded-full transition-colors cursor-pointer"
                style={{ background: settings.autoRefresh ? 'var(--accent-cyan)' : '#334155' }}
                onClick={() => updateSettings({ autoRefresh: !settings.autoRefresh })}
              >
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ left: settings.autoRefresh ? '19px' : '2px' }} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {settings.autoRefresh ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          {settings.autoRefresh && (
            <div className="mt-3">
              <label className="section-title block mb-1.5">Interval (seconds)</label>
              <select className="gl-select w-full" value={settings.refreshInterval}
                onChange={(e) => updateSettings({ refreshInterval: +e.target.value })}>
                {[15, 30, 60, 120, 300].map(v => <option key={v} value={v}>{v}s</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Alert Thresholds */}
        <div className="gl-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={12} style={{ color: 'var(--accent-cyan)' }} />
            <span className="panel-title">Alert Thresholds</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="section-title block mb-1">Congestion Score Alert</label>
              <div className="flex items-center gap-2">
                <input type="range" min={40} max={90} step={5} value={settings.alertThresholds.congestionScore}
                  onChange={(e) => updateSettings({ alertThresholds: { ...settings.alertThresholds, congestionScore: +e.target.value } })}
                  className="flex-1 accent-cyan-400" />
                <span className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-cyan)', width: '30px' }}>
                  {settings.alertThresholds.congestionScore}
                </span>
              </div>
            </div>
            <div>
              <label className="section-title block mb-1">Deployment Gap Alert</label>
              <div className="flex items-center gap-2">
                <input type="range" min={1} max={10} step={1} value={settings.alertThresholds.deploymentGap}
                  onChange={(e) => updateSettings({ alertThresholds: { ...settings.alertThresholds, deploymentGap: +e.target.value } })}
                  className="flex-1 accent-cyan-400" />
                <span className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-cyan)', width: '30px' }}>
                  {settings.alertThresholds.deploymentGap}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="gl-card p-4">
          <div className="panel-title mb-3">About GridLocked</div>
          <div className="space-y-1" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Version:</span> 2.0.0</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Challenge:</span> GridLock 2.0 — Event-Driven Congestion Forecasting</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Developed By:</span> Code Crumbles</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Tagline:</span> Predict · Plan · Prevent</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Stack:</span> Next.js 14, FastAPI, ECharts, Mappls SDK</div>
          </div>
        </div>
      </div>
    </div>
  );
}
