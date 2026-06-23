'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
  accentColor?: string;
  icon?: React.ReactNode;
  sublabel?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function KPICard({
  label,
  value,
  unit,
  delta,
  accentColor = 'var(--accent-cyan)',
  icon,
  sublabel,
  loading,
  onClick,
}: KPICardProps) {
  const hasDelta = delta !== undefined && delta !== 0;
  const isPositive = (delta || 0) > 0;

  return (
    <motion.div
      className="kpi-card cursor-default"
      style={{ '--kpi-accent': accentColor } as any}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={onClick}
    >
      {loading ? (
        <div>
          <div className="gl-skeleton h-7 w-20 mb-2" />
          <div className="gl-skeleton h-3 w-28" />
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="flex items-start justify-between mb-1">
            <div className="kpi-label">{label}</div>
            {icon && (
              <div style={{ color: accentColor, opacity: 0.7 }}>
                {icon}
              </div>
            )}
          </div>

          {/* Value */}
          <div className="flex items-baseline gap-1">
            <span className="kpi-value" style={{ color: accentColor }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {unit && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>
                {unit}
              </span>
            )}
          </div>

          {/* Sublabel / Delta */}
          <div className="flex items-center justify-between mt-2">
            {sublabel && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sublabel}</span>
            )}
            {hasDelta && (
              <div className={cn('flex items-center gap-0.5', isPositive ? 'text-red-400' : 'text-green-400')}
                style={{ fontSize: '10px', fontWeight: 600 }}>
                {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {isPositive ? '+' : ''}{delta}%
              </div>
            )}
            {!hasDelta && !sublabel && (
              <div className="flex items-center gap-0.5" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                <Minus size={10} /> Stable
              </div>
            )}
          </div>

          {/* Bottom accent bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-20"
            style={{ background: accentColor }} />
        </>
      )}
    </motion.div>
  );
}
