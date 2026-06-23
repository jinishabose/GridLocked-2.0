'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useGridLockedStore } from '@/lib/store';

interface DataLoaderProps {
  children: React.ReactNode;
}

export function DataLoader({ children }: DataLoaderProps) {
  const { loadCSV, dataLoaded, isLoading } = useGridLockedStore();
  const [loadAttempted, setLoadAttempted] = useState(false);

  const loadData = useCallback(async () => {
    if (loadAttempted) return;
    setLoadAttempted(true);
    try {
      // Try to load from the public/data folder
      const res = await fetch('/data/events.csv');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      loadCSV(text);
    } catch (err) {
      console.warn('Could not auto-load CSV from /data/events.csv:', err);
    }
  }, [loadCSV, loadAttempted]);

  useEffect(() => {
    if (!dataLoaded && !isLoading) {
      loadData();
    }
  }, [dataLoaded, isLoading, loadData]);

  return <>{children}</>;
}
