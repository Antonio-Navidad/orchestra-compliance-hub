// Demo shipment data for Multi-Shipment Watch Mode
// Coordinate-driven movement along route geometry

export interface WatchShipment {
  id: string;
  reference: string;
  origin: { name: string; coords: [number, number] };
  destination: { name: string; coords: [number, number] };
  mode: 'sea' | 'air' | 'land';
  route: [number, number][];
  progress: number; // 0-100
  status: 'active' | 'delayed' | 'at_risk' | 'blocked' | 'completed';
  eta_original: string;
  eta_current: string;
  delay_minutes: number;
  risk_score: number;
  congestion_score: number;
  weather_score: number;
  compliance_score: number;
  priority: 'critical' | 'high' | 'normal' | 'low';
  pinned: boolean;
  watched: boolean;
  alert_count: number;
  alerts: WatchAlert[];
  last_updated: string;
  color: string;
  client: string;
  cargo_summary: string;
}

export interface WatchAlert {
  id: string;
  type: 'delay' | 'weather' | 'congestion' | 'compliance' | 'deviation' | 'eta_change' | 'risk_threshold' | 'military';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

// Generate arc points for sea/air routes
function arcPoints(start: [number, number], end: [number, number], n = 20, bulge = 0.15): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const lng = start[0] + (end[0] - start[0]) * t;
    const lat = start[1] + (end[1] - start[1]) * t;
    const offset = Math.sin(t * Math.PI) * bulge * Math.abs(end[0] - start[0]);
    pts.push([lng, lat + offset]);
  }
  return pts;
}

const now = new Date();
const hours = (h: number) => new Date(now.getTime() + h * 3600000).toISOString();

export const DEMO_SHIPMENTS: WatchShipment[] = [
  {
    id: "ws-001",
    reference: "SH-2026-0401",
    origin: { name: "Shanghai", coords: [121.47, 31.23] },
    destination: { name: "Rotterdam", coords: [4.48, 51.92] },
    mode: "sea",
    route: arcPoints([121.47, 31.23], [4.48, 51.92], 30, 0.12),
    progress: 62,
    status: "active",
    eta_original: hours(120),
    eta_current: hours(132),
    delay_minutes: 720,
    risk_score: 35,
    congestion_score: 55,
    weather_score: 40,
    compliance_score: 92,
    priority: "high",
    pinned: true,
    watched: true,
    alert_count: 2,
    alerts: [
      { id: "a1", type: "delay", severity: "warning", message: "12h delay at Suez Canal approach", timestamp: hours(-2) },
      { id: "a2", type: "weather", severity: "info", message: "Moderate seas in Mediterranean", timestamp: hours(-1) },
    ],
    last_updated: hours(-0.5),
    color: "#3b82f6",
    client: "TechParts GmbH",
    cargo_summary: "Electronics components — 4 containers",
  },
  {
    id: "ws-002",
    reference: "SH-2026-0402",
    origin: { name: "Los Angeles", coords: [-118.25, 33.95] },
    destination: { name: "Singapore", coords: [103.82, 1.35] },
    mode: "sea",
    route: arcPoints([-118.25, 33.95], [103.82, 1.35], 30, -0.18),
    progress: 28,
    status: "at_risk",
    eta_original: hours(240),
    eta_current: hours(288),
    delay_minutes: 2880,
    risk_score: 72,
    congestion_score: 68,
    weather_score: 75,
    compliance_score: 78,
    priority: "critical",
    pinned: true,
    watched: true,
    alert_count: 4,
    alerts: [
      { id: "a3", type: "risk_threshold", severity: "critical", message: "Risk score exceeded 70 threshold", timestamp: hours(-1) },
      { id: "a4", type: "weather", severity: "warning", message: "Typhoon warning in Pacific corridor", timestamp: hours(-3) },
      { id: "a5", type: "congestion", severity: "warning", message: "Port congestion at Singapore", timestamp: hours(-6) },
      { id: "a6", type: "eta_change", severity: "info", message: "ETA shifted +48h", timestamp: hours(-4) },
    ],
    last_updated: hours(-0.2),
    color: "#ef4444",
    client: "Pacific Exports Ltd",
    cargo_summary: "Auto parts — 8 containers",
  },
  {
    id: "ws-003",
    reference: "SH-2026-0403",
    origin: { name: "Dubai", coords: [55.27, 25.20] },
    destination: { name: "Hamburg", coords: [9.99, 53.55] },
    mode: "air",
    route: arcPoints([55.27, 25.20], [9.99, 53.55], 15, 0.08),
    progress: 85,
    status: "active",
    eta_original: hours(8),
    eta_current: hours(9),
    delay_minutes: 60,
    risk_score: 12,
    congestion_score: 20,
    weather_score: 15,
    compliance_score: 98,
    priority: "normal",
    pinned: false,
    watched: true,
    alert_count: 0,
    alerts: [],
    last_updated: hours(-0.1),
    color: "#a855f7",
    client: "Aeroframe Corp",
    cargo_summary: "Pharmaceuticals — priority air",
  },
  {
    id: "ws-004",
    reference: "SH-2026-0404",
    origin: { name: "Cartagena", coords: [-75.51, 10.39] },
    destination: { name: "Miami", coords: [-80.19, 25.76] },
    mode: "sea",
    route: arcPoints([-75.51, 10.39], [-80.19, 25.76], 15, 0.05),
    progress: 45,
    status: "blocked",
    eta_original: hours(48),
    eta_current: hours(96),
    delay_minutes: 2880,
    risk_score: 88,
    congestion_score: 30,
    weather_score: 25,
    compliance_score: 42,
    priority: "critical",
    pinned: true,
    watched: true,
    alert_count: 3,
    alerts: [
      { id: "a7", type: "compliance", severity: "critical", message: "DIAN compliance block — missing docs", timestamp: hours(-1) },
      { id: "a8", type: "deviation", severity: "warning", message: "Customs hold at Cartagena port", timestamp: hours(-5) },
      { id: "a9", type: "risk_threshold", severity: "critical", message: "Risk score 88 — immediate attention", timestamp: hours(-2) },
    ],
    last_updated: hours(-0.3),
    color: "#f97316",
    client: "LatAm Fresh Co",
    cargo_summary: "Agricultural products — perishable",
  },
  {
    id: "ws-005",
    reference: "SH-2026-0405",
    origin: { name: "Medellín", coords: [-75.57, 6.25] },
    destination: { name: "Panama", coords: [-79.52, 8.98] },
    mode: "land",
    route: [[-75.57, 6.25], [-76.10, 7.10], [-76.65, 7.80], [-77.30, 8.10], [-78.20, 8.50], [-79.52, 8.98]],
    progress: 70,
    status: "delayed",
    eta_original: hours(18),
    eta_current: hours(24),
    delay_minutes: 360,
    risk_score: 52,
    congestion_score: 65,
    weather_score: 45,
    compliance_score: 85,
    priority: "high",
    pinned: false,
    watched: true,
    alert_count: 1,
    alerts: [
      { id: "a10", type: "congestion", severity: "warning", message: "Border congestion at Darién corridor", timestamp: hours(-2) },
    ],
    last_updated: hours(-1),
    color: "#22c55e",
    client: "Andean Logistics",
    cargo_summary: "Textiles — 2 trucks",
  },
  {
    id: "ws-006",
    reference: "SH-2026-0406",
    origin: { name: "Shanghai", coords: [121.47, 31.23] },
    destination: { name: "Los Angeles", coords: [-118.25, 33.95] },
    mode: "sea",
    route: arcPoints([121.47, 31.23], [-118.25, 33.95], 30, 0.15),
    progress: 92,
    status: "active",
    eta_original: hours(24),
    eta_current: hours(26),
    delay_minutes: 120,
    risk_score: 18,
    congestion_score: 35,
    weather_score: 20,
    compliance_score: 95,
    priority: "normal",
    pinned: false,
    watched: true,
    alert_count: 0,
    alerts: [],
    last_updated: hours(-0.5),
    color: "#06b6d4",
    client: "WestCoast Imports",
    cargo_summary: "Consumer electronics — 6 containers",
  },
  {
    id: "ws-007",
    reference: "SH-2026-0407",
    origin: { name: "Rotterdam", coords: [4.48, 51.92] },
    destination: { name: "Dubai", coords: [55.27, 25.20] },
    mode: "sea",
    route: arcPoints([4.48, 51.92], [55.27, 25.20], 25, -0.1),
    progress: 15,
    status: "active",
    eta_original: hours(300),
    eta_current: hours(310),
    delay_minutes: 600,
    risk_score: 28,
    congestion_score: 42,
    weather_score: 35,
    compliance_score: 90,
    priority: "normal",
    pinned: false,
    watched: true,
    alert_count: 1,
    alerts: [
      { id: "a11", type: "military", severity: "info", message: "Naval exercise zone near Bab el-Mandeb", timestamp: hours(-8) },
    ],
    last_updated: hours(-2),
    color: "#eab308",
    client: "EuroGulf Trade",
    cargo_summary: "Machinery parts — 3 containers",
  },
  {
    id: "ws-008",
    reference: "SH-2026-0408",
    origin: { name: "Hamburg", coords: [9.99, 53.55] },
    destination: { name: "Medellín", coords: [-75.57, 6.25] },
    mode: "air",
    route: arcPoints([9.99, 53.55], [-75.57, 6.25], 15, 0.12),
    progress: 55,
    status: "active",
    eta_original: hours(14),
    eta_current: hours(15),
    delay_minutes: 60,
    risk_score: 22,
    congestion_score: 15,
    weather_score: 30,
    compliance_score: 88,
    priority: "normal",
    pinned: false,
    watched: true,
    alert_count: 0,
    alerts: [],
    last_updated: hours(-0.8),
    color: "#d946ef",
    client: "Andean Pharma",
    cargo_summary: "Medical devices — express air",
  },
];

// Get position along route based on progress
export function getPositionOnRoute(route: [number, number][], progress: number): [number, number] {
  const p = Math.max(0, Math.min(100, progress)) / 100;
  const idx = p * (route.length - 1);
  const i = Math.floor(idx);
  const t = idx - i;
  if (i >= route.length - 1) return route[route.length - 1];
  return [
    route[i][0] + (route[i + 1][0] - route[i][0]) * t,
    route[i][1] + (route[i + 1][1] - route[i][1]) * t,
  ];
}

// Simulate movement: small random progress increments
export function simulateTick(shipments: WatchShipment[]): WatchShipment[] {
  return shipments.map(s => {
    if (s.status === 'completed' || s.status === 'blocked') return s;
    const delta = Math.random() * 0.4;
    const newProgress = Math.min(100, s.progress + delta);
    return {
      ...s,
      progress: newProgress,
      status: newProgress >= 100 ? 'completed' : s.status,
      last_updated: new Date().toISOString(),
    };
  });
}

// Convert shipments to GeoJSON for map rendering
export function shipmentsToRoutesGeoJSON(shipments: WatchShipment[]) {
  return {
    type: "FeatureCollection" as const,
    features: shipments.map(s => ({
      type: "Feature" as const,
      properties: {
        id: s.id,
        reference: s.reference,
        mode: s.mode,
        status: s.status,
        risk_score: s.risk_score,
        color: s.color,
        progress: s.progress,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: s.route,
      },
    })),
  };
}

export function shipmentsToPositionsGeoJSON(shipments: WatchShipment[]) {
  return {
    type: "FeatureCollection" as const,
    features: shipments.map(s => {
      const pos = getPositionOnRoute(s.route, s.progress);
      return {
        type: "Feature" as const,
        properties: {
          id: s.id,
          reference: s.reference,
          mode: s.mode,
          status: s.status,
          risk_score: s.risk_score,
          color: s.color,
          priority: s.priority,
          alert_count: s.alert_count,
        },
        geometry: {
          type: "Point" as const,
          coordinates: pos,
        },
      };
    }),
  };
}

export function shipmentsToEndpointsGeoJSON(shipments: WatchShipment[]) {
  const pts: any[] = [];
  const seen = new Set<string>();
  for (const s of shipments) {
    const oKey = `${s.origin.coords[0]},${s.origin.coords[1]}`;
    const dKey = `${s.destination.coords[0]},${s.destination.coords[1]}`;
    if (!seen.has(oKey)) {
      seen.add(oKey);
      pts.push({
        type: "Feature",
        properties: { name: s.origin.name, type: "origin" },
        geometry: { type: "Point", coordinates: s.origin.coords },
      });
    }
    if (!seen.has(dKey)) {
      seen.add(dKey);
      pts.push({
        type: "Feature",
        properties: { name: s.destination.name, type: "destination" },
        geometry: { type: "Point", coordinates: s.destination.coords },
      });
    }
  }
  return { type: "FeatureCollection" as const, features: pts };
}
