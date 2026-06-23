'use client';
// GridLocked — Zustand Global State Store

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  TrafficEvent,
  KPIMetrics,
  CorridorStats,
  ZoneStats,
  HourlyPattern,
  EventTypeStats,
  AlertItem,
  ResourcePlan,
  AIInsight,
  FilterState,
  AppSettings,
  MapLayer,
  MonthlyTrend,
  PostEventComparison,
} from '@/types';
import {
  parseEventsFromText,
  computeKPIs,
  computeCorridorStats,
  computeZoneStats,
  computeHourlyPatterns,
  computeEventTypeStats,
  generateAlerts,
  computeResourcePlan,
  generateAIInsights,
  computeMonthlyTrends,
  generatePostEventLearning,
} from './dataEngine';

interface GridLockedStore {
  // Data
  events: TrafficEvent[];
  filteredEvents: TrafficEvent[];
  isLoading: boolean;
  loadError: string | null;
  dataLoaded: boolean;

  // Analytics
  kpiMetrics: KPIMetrics | null;
  corridorStats: CorridorStats[];
  zoneStats: ZoneStats[];
  hourlyPatterns: HourlyPattern[];
  eventTypeStats: EventTypeStats[];
  alerts: AlertItem[];
  resourcePlan: ResourcePlan[];
  aiInsights: AIInsight[];
  monthlyTrends: MonthlyTrend[];
  postEventData: PostEventComparison[];

  // UI State
  activeModule: string;
  filters: FilterState;
  settings: AppSettings;
  mapLayers: MapLayer[];
  selectedEvent: TrafficEvent | null;
  sidebarCollapsed: boolean;
  notificationCount: number;

  // Actions
  loadCSV: (csvText: string) => void;
  setFilter: (key: keyof FilterState, value: string) => void;
  resetFilters: () => void;
  setActiveModule: (module: string) => void;
  selectEvent: (event: TrafficEvent | null) => void;
  toggleMapLayer: (layerId: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  toggleSidebar: () => void;
  acknowledgeAlert: (alertId: string) => void;
}

const DEFAULT_FILTERS: FilterState = {
  status: 'all',
  riskLevel: 'all',
  eventType: 'all',
  corridor: 'all',
  zone: 'all',
  dateFrom: '',
  dateTo: '',
  searchQuery: '',
  cause: 'all',
  date: '',
  time: '',
};

const DEFAULT_SETTINGS: AppSettings = {
  mapplsApiKey: '',
  region: 'Bengaluru',
  theme: 'dark',
  autoRefresh: false,
  refreshInterval: 30,
  alertThresholds: {
    congestionScore: 60,
    deploymentGap: 3,
  },
};

const DEFAULT_MAP_LAYERS: MapLayer[] = [
  { id: 'events', name: 'Event Locations', enabled: true, icon: 'MapPin' },
  { id: 'closures', name: 'Road Closures', enabled: true, icon: 'Ban' },
  { id: 'congestion', name: 'Traffic Congestion Heatmap', enabled: true, icon: 'AlertTriangle' },
  { id: 'police', name: 'Police Deployment', enabled: false, icon: 'Shield' },
  { id: 'hotspots', name: 'Parking Hotspots', enabled: true, icon: 'Flame' },
  { id: 'diversions', name: 'Diversion Routes', enabled: false, icon: 'ArrowLeftRight' },
];
function applyFilters(events: TrafficEvent[], filters: FilterState): TrafficEvent[] {
  return events.filter((ev) => {
    if (filters.status !== 'all' && ev.status !== filters.status) return false;
    if (filters.eventType !== 'all' && ev.event_type !== filters.eventType) return false;
    if (filters.corridor !== 'all' && ev.corridor !== filters.corridor) return false;
    if (filters.zone !== 'all' && ev.zone !== filters.zone) return false;
    if (filters.cause !== 'all' && ev.event_cause !== filters.cause) return false;

    if (filters.riskLevel !== 'all') {
      const labelMap: Record<string, string[]> = {
        Critical: ['Severe Congestion'],
        High: ['High Impact'],
        Medium: ['Moderate Impact'],
        Low: ['Low Impact'],
      };
      const labels = labelMap[filters.riskLevel];
      if (labels && !labels.includes(ev.congestion_label)) return false;
    }

    if (filters.date) {
      const [year, month, day] = filters.date.split('-').map(Number);
      if (ev.event_year !== year || ev.event_month !== month || ev.event_day !== day) {
        return false;
      }
    }

    if (filters.time) {
      const filterHour = parseInt(filters.time.split(':')[0], 10);
      if (ev.event_hour !== filterHour) {
        return false;
      }
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      if (
        !ev.id.toLowerCase().includes(q) &&
        !ev.address.toLowerCase().includes(q) &&
        !ev.event_cause.toLowerCase().includes(q) &&
        !ev.corridor.toLowerCase().includes(q) &&
        !(ev.zone || '').toLowerCase().includes(q)
      ) {
        return false;
      }
    }

    return true;
  });
}

export const useGridLockedStore = create<GridLockedStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      events: [],
      filteredEvents: [],
      isLoading: false,
      loadError: null,
      dataLoaded: false,
      kpiMetrics: null,
      corridorStats: [],
      zoneStats: [],
      hourlyPatterns: [],
      eventTypeStats: [],
      alerts: [],
      resourcePlan: [],
      aiInsights: [],
      monthlyTrends: [],
      postEventData: [],
      activeModule: 'command-center',
      filters: DEFAULT_FILTERS,
      settings: DEFAULT_SETTINGS,
      mapLayers: DEFAULT_MAP_LAYERS,
      selectedEvent: null,
      sidebarCollapsed: false,
      notificationCount: 0,

      loadCSV: (csvText: string) => {
        set({ isLoading: true, loadError: null });
        try {
          const events = parseEventsFromText(csvText);
          const corridorStats = computeCorridorStats(events);
          const alerts = generateAlerts(events);
          const aiInsights = generateAIInsights(events, corridorStats);

          set({
            events,
            filteredEvents: events,
            isLoading: false,
            dataLoaded: true,
            kpiMetrics: computeKPIs(events),
            corridorStats,
            zoneStats: computeZoneStats(events),
            hourlyPatterns: computeHourlyPatterns(events),
            eventTypeStats: computeEventTypeStats(events),
            alerts,
            resourcePlan: computeResourcePlan(events),
            aiInsights,
            monthlyTrends: computeMonthlyTrends(events),
            postEventData: generatePostEventLearning(events),
            notificationCount: alerts.filter((a) => !a.acknowledged).length,
          });
        } catch (err: any) {
          set({ isLoading: false, loadError: err.message || 'Failed to parse dataset' });
        }
      },

      setFilter: (key, value) => {
        const filters = { ...get().filters, [key]: value };
        const filteredEvents = applyFilters(get().events, filters);
        
        const kpiMetrics = computeKPIs(filteredEvents);
        const corridorStats = computeCorridorStats(filteredEvents);
        const zoneStats = computeZoneStats(filteredEvents);
        const hourlyPatterns = computeHourlyPatterns(filteredEvents);
        const eventTypeStats = computeEventTypeStats(filteredEvents);
        const alerts = generateAlerts(filteredEvents);
        const resourcePlan = computeResourcePlan(filteredEvents);
        const monthlyTrends = computeMonthlyTrends(filteredEvents);
        const postEventData = generatePostEventLearning(filteredEvents);

        set({
          filters,
          filteredEvents,
          kpiMetrics,
          corridorStats,
          zoneStats,
          hourlyPatterns,
          eventTypeStats,
          alerts,
          resourcePlan,
          monthlyTrends,
          postEventData,
          notificationCount: alerts.filter((a) => !a.acknowledged).length,
        });
      },

      resetFilters: () => {
        const events = get().events;
        const kpiMetrics = computeKPIs(events);
        const corridorStats = computeCorridorStats(events);
        const zoneStats = computeZoneStats(events);
        const hourlyPatterns = computeHourlyPatterns(events);
        const eventTypeStats = computeEventTypeStats(events);
        const alerts = generateAlerts(events);
        const resourcePlan = computeResourcePlan(events);
        const monthlyTrends = computeMonthlyTrends(events);
        const postEventData = generatePostEventLearning(events);

        set({
          filters: DEFAULT_FILTERS,
          filteredEvents: events,
          kpiMetrics,
          corridorStats,
          zoneStats,
          hourlyPatterns,
          eventTypeStats,
          alerts,
          resourcePlan,
          monthlyTrends,
          postEventData,
          notificationCount: alerts.filter((a) => !a.acknowledged).length,
        });
      },

      setActiveModule: (module) => set({ activeModule: module }),

      selectEvent: (event) => set({ selectedEvent: event }),

      toggleMapLayer: (layerId) => {
        const mapLayers = get().mapLayers.map((l) =>
          l.id === layerId ? { ...l, enabled: !l.enabled } : l
        );
        set({ mapLayers });
      },

      updateSettings: (newSettings) => {
        set({ settings: { ...get().settings, ...newSettings } });
      },

      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),

      acknowledgeAlert: (alertId) => {
        const alerts = get().alerts.map((a) =>
          a.id === alertId ? { ...a, acknowledged: true } : a
        );
        set({ alerts, notificationCount: alerts.filter((a) => !a.acknowledged).length });
      },
    }),
    { name: 'gridlocked-store' }
  )
);
