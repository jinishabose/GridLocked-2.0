// GridLocked — Core Type Definitions
// Developed By: Code Crumbles

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type EventStatus = 'active' | 'closed' | 'resolved';
export type EventType = 'planned' | 'unplanned';
export type DecisionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type DiversionPriority = 'LOW' | 'HIGH' | 'CRITICAL';
export type ZoneRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CongestionLabel = 'Low Impact' | 'Moderate Impact' | 'High Impact' | 'Severe Congestion';
export type MarkerColor = 'green' | 'yellow' | 'orange' | 'red';

export interface TrafficEvent {
  // --- Raw CSV Fields ---
  id: string;
  event_type: EventType;
  latitude: number;
  longitude: number;
  endlatitude?: number;
  endlongitude?: number;
  address: string;
  end_address?: string;
  event_cause: string;
  requires_road_closure: boolean;
  start_datetime?: string;
  end_datetime?: string;
  status: EventStatus;
  authenticated: string;
  modified_datetime?: string;
  direction?: string;
  description?: string;
  veh_type?: string;
  veh_no?: string;
  corridor: string;
  priority: string;
  cargo_material?: string;
  reason_breakdown?: string;
  age_of_truck?: number;
  police_station?: string;
  comment?: string;
  meta_data?: string;
  kgid?: string;
  resolved_at_address?: string;
  resolved_at_latitude?: number;
  resolved_at_longitude?: number;
  gba_identifier?: string;
  zone?: string;
  junction?: string;

  // --- Derived / Pre-computed Fields ---
  event_year?: number;
  event_month?: number;
  event_day?: number;
  event_hour?: number;
  weekday?: string;
  is_weekend: number;
  is_peak_hour: number;
  duration_hours: number;
  traffic_cluster?: number;
  cluster_event_density?: number;
  severity_score?: number;
  road_closure_flag: number;
  congestion_risk_score: number;
  congestion_label: CongestionLabel;
  zone_risk_level: ZoneRiskLevel;
  is_hotspot: number;
  recommended_police: number;
  recommended_barricades: number;
  diversion_required: string;
  diversion_priority: DiversionPriority;
  impact_radius_m: number;
  marker_color: MarkerColor;
  marker_icon?: string;
  alert_title: string;
  alert_description: string;
  decision_priority: DecisionPriority;
  recommended_action: string;
}

export interface KPIMetrics {
  activeEvents: number;
  highRiskEvents: number;
  predictedCongestionScore: number;
  affectedCorridors: number;
  recommendedOfficers: number;
  roadClosures: number;
  totalEvents: number;
  criticalEvents: number;
  plannedEvents: number;
  unplannedEvents: number;
  hotspots: number;
  diversionsRequired: number;
}

export interface CorridorStats {
  corridor: string;
  eventCount: number;
  avgCongestionScore: number;
  maxCongestionScore: number;
  activeEvents: number;
  requiredPolice: number;
  requiredBarricades: number;
  diversionsNeeded: number;
  riskLevel: RiskLevel;
}

export interface ZoneStats {
  zone: string;
  eventCount: number;
  avgCongestion: number;
  riskLevel: ZoneRiskLevel;
}

export interface HourlyPattern {
  hour: number;
  eventCount: number;
  avgCongestion: number;
  peakCongestion: number;
}

export interface EventTypeStats {
  event_type: string;
  count: number;
  avgCongestion: number;
  avgPolice: number;
  avgDuration: number;
  diversionRate: number;
}

export interface EventCauseStats {
  cause: string;
  count: number;
  avgCongestion: number;
  closureRate: number;
}

export interface ForecastResult {
  congestionScore: number;
  riskLevel: RiskLevel;
  expectedDelay: number; // minutes
  affectedCorridors: string[];
  recommendedPolice: number;
  recommendedBarricades: number;
  diversionRequired: boolean;
  diversionPriority: DiversionPriority;
  impactRadius: number;
  confidence: number;
  reasoning: string[];
}

export interface AIInsight {
  id: string;
  category: 'pattern' | 'anomaly' | 'optimization' | 'forecast' | 'risk' | 'policy';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
  dataPoints: number;
  timestamp: string;
}

export interface ResourcePlan {
  corridor: string;
  zone?: string;
  requiredPolice: number;
  requiredBarricades: number;
  requiredCones: number;
  requiredTowTrucks: number;
  diversionTeams: number;
  availablePolice: number;
  policeGap: number;
  priority: DecisionPriority;
}

export interface MapLayer {
  id: string;
  name: string;
  enabled: boolean;
  icon: string;
}

export interface AlertItem {
  id: string;
  eventId: string;
  type: 'congestion' | 'deployment' | 'closure' | 'diversion' | 'critical';
  title: string;
  description: string;
  severity: RiskLevel;
  timestamp: string;
  location: string;
  acknowledged: boolean;
}

export interface DiversionRoute {
  eventId: string;
  originAddress: string;
  alternateRoute: string;
  estimatedDelay: number;
  confidence: number;
  activated: boolean;
}

export interface MonthlyTrend {
  month: string;
  eventCount: number;
  avgCongestion: number;
  closures: number;
  accidents: number;
}

export interface PostEventComparison {
  eventId: string;
  eventType: string;
  location: string;
  predictedCongestion: number;
  actualCongestion: number;
  predictedPolice: number;
  actualPolice: number;
  diversionRecommended: boolean;
  diversionActivated: boolean;
  lesson: string;
}

export interface FilterState {
  status: EventStatus | 'all';
  riskLevel: RiskLevel | 'all';
  eventType: EventType | 'all';
  corridor: string;
  zone: string;
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
  cause: string;
  date?: string;
  time?: string;
}

export interface AppSettings {
  mapplsApiKey: string;
  region: string;
  theme: 'dark' | 'light';
  autoRefresh: boolean;
  refreshInterval: number;
  alertThresholds: {
    congestionScore: number;
    deploymentGap: number;
  };
}
