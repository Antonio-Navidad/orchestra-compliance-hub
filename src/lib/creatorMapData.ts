// ============================================================
// Geospatial data for Creator Mode map
// All coordinates are [lng, lat] per GeoJSON/MapLibre convention
// ============================================================

export interface LogisticsHub {
  id: string;
  name: string;
  type: "port" | "airport" | "hub" | "city";
  coordinates: [number, number]; // [lng, lat]
  country: string;
  region: string;
}

export interface MapRoute {
  id: string;
  label: string;
  mode: "sea" | "air" | "land";
  origin: string; // hub id
  destination: string; // hub id
  coordinates: [number, number][]; // waypoints
  risk_score: number;
  congestion_score: number;
  weather_score: number;
  privacy_masking: boolean;
}

export interface OverlayZone {
  id: string;
  type: "weather" | "congestion" | "military" | "warning";
  label: string;
  center: [number, number];
  radiusKm: number;
  severity: "low" | "medium" | "high" | "critical";
}

// ── LOGISTICS HUBS ──────────────────────────────────────────
export const HUBS: LogisticsHub[] = [
  { id: "shanghai",    name: "Shanghai",        type: "port",    coordinates: [121.4737, 31.2304],  country: "CN", region: "East Asia" },
  { id: "singapore",   name: "Singapore",       type: "port",    coordinates: [103.8198, 1.3521],   country: "SG", region: "Southeast Asia" },
  { id: "rotterdam",   name: "Rotterdam",       type: "port",    coordinates: [4.4777, 51.9244],    country: "NL", region: "Europe" },
  { id: "losangeles",  name: "Los Angeles",     type: "port",    coordinates: [-118.2437, 33.9425], country: "US", region: "North America" },
  { id: "miami",       name: "Miami",           type: "port",    coordinates: [-80.1918, 25.7617],  country: "US", region: "North America" },
  { id: "cartagena",   name: "Cartagena",       type: "port",    coordinates: [-75.5144, 10.3910],  country: "CO", region: "Latin America" },
  { id: "medellin",    name: "Medellín",        type: "hub",     coordinates: [-75.5636, 6.2476],   country: "CO", region: "Latin America" },
  { id: "panama",      name: "Panama Canal",    type: "port",    coordinates: [-79.9197, 9.0800],   country: "PA", region: "Central America" },
  { id: "hamburg",     name: "Hamburg",         type: "port",    coordinates: [9.9937, 53.5511],    country: "DE", region: "Europe" },
  { id: "dubai",       name: "Dubai",           type: "port",    coordinates: [55.2708, 25.2048],   country: "AE", region: "Middle East" },
  { id: "hongkong",    name: "Hong Kong",       type: "airport", coordinates: [113.9185, 22.3080],  country: "HK", region: "East Asia" },
  { id: "tokyo",       name: "Tokyo",           type: "airport", coordinates: [139.7808, 35.5494],  country: "JP", region: "East Asia" },
  { id: "mumbai",      name: "Mumbai",          type: "port",    coordinates: [72.8777, 19.0760],   country: "IN", region: "South Asia" },
  { id: "bogota",      name: "Bogotá",          type: "airport", coordinates: [-74.0721, 4.7110],   country: "CO", region: "Latin America" },
  { id: "newyork",     name: "New York",        type: "port",    coordinates: [-74.0060, 40.7128],  country: "US", region: "North America" },
  { id: "london",      name: "London",          type: "airport", coordinates: [-0.4614, 51.4700],   country: "GB", region: "Europe" },
];

// ── Helper: generate great-circle arc points ────────────────
function arcPoints(from: [number, number], to: [number, number], numPoints = 40): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lng = from[0] + (to[0] - from[0]) * t;
    const lat = from[1] + (to[1] - from[1]) * t;
    // Add curvature for visual effect
    const curve = Math.sin(t * Math.PI) * (Math.abs(to[0] - from[0]) * 0.08);
    points.push([lng, lat + curve]);
  }
  return points;
}

// ── SEA ROUTES ──────────────────────────────────────────────
export const SEA_ROUTES: MapRoute[] = [
  {
    id: "sea-shanghai-singapore",
    label: "Shanghai → Singapore",
    mode: "sea",
    origin: "shanghai",
    destination: "singapore",
    coordinates: [
      [121.47, 31.23], [119.0, 27.0], [117.0, 22.5], [114.2, 18.0],
      [110.0, 12.0], [107.0, 7.0], [103.82, 1.35],
    ],
    risk_score: 15, congestion_score: 45, weather_score: 20, privacy_masking: false,
  },
  {
    id: "sea-singapore-dubai",
    label: "Singapore → Dubai",
    mode: "sea",
    origin: "singapore",
    destination: "dubai",
    coordinates: [
      [103.82, 1.35], [98.0, 3.0], [85.0, 7.0], [72.88, 12.0],
      [60.0, 16.0], [55.27, 25.20],
    ],
    risk_score: 25, congestion_score: 30, weather_score: 35, privacy_masking: false,
  },
  {
    id: "sea-dubai-rotterdam",
    label: "Dubai → Rotterdam",
    mode: "sea",
    origin: "dubai",
    destination: "rotterdam",
    coordinates: [
      [55.27, 25.20], [43.0, 28.0], [32.3, 31.2], [30.0, 31.5],
      [15.0, 35.0], [5.0, 36.0], [-5.0, 37.0], [-9.0, 40.0],
      [-5.0, 45.0], [0.0, 48.0], [2.0, 50.0], [4.48, 51.92],
    ],
    risk_score: 30, congestion_score: 55, weather_score: 40, privacy_masking: false,
  },
  {
    id: "sea-shanghai-la",
    label: "Shanghai → Los Angeles",
    mode: "sea",
    origin: "shanghai",
    destination: "losangeles",
    coordinates: [
      [121.47, 31.23], [130.0, 33.0], [140.0, 35.0], [160.0, 38.0],
      [180.0, 40.0], [-170.0, 42.0], [-155.0, 40.0], [-140.0, 37.0],
      [-130.0, 35.0], [-118.24, 33.94],
    ],
    risk_score: 20, congestion_score: 50, weather_score: 30, privacy_masking: false,
  },
  {
    id: "sea-panama-miami",
    label: "Panama → Miami",
    mode: "sea",
    origin: "panama",
    destination: "miami",
    coordinates: [
      [-79.92, 9.08], [-80.5, 12.0], [-81.0, 16.0], [-81.5, 20.0],
      [-80.5, 23.0], [-80.19, 25.76],
    ],
    risk_score: 10, congestion_score: 25, weather_score: 20, privacy_masking: false,
  },
  {
    id: "sea-cartagena-panama",
    label: "Cartagena → Panama",
    mode: "sea",
    origin: "cartagena",
    destination: "panama",
    coordinates: [
      [-75.51, 10.39], [-76.5, 10.0], [-78.0, 9.5], [-79.92, 9.08],
    ],
    risk_score: 18, congestion_score: 35, weather_score: 15, privacy_masking: true,
  },
];

// ── AIR ROUTES ──────────────────────────────────────────────
export const AIR_ROUTES: MapRoute[] = [
  {
    id: "air-shanghai-la",
    label: "Shanghai ✈ Los Angeles",
    mode: "air",
    origin: "shanghai",
    destination: "losangeles",
    coordinates: arcPoints([121.47, 31.23], [-118.24, 33.94]),
    risk_score: 5, congestion_score: 20, weather_score: 15, privacy_masking: false,
  },
  {
    id: "air-london-dubai",
    label: "London ✈ Dubai",
    mode: "air",
    origin: "london",
    destination: "dubai",
    coordinates: arcPoints([-0.46, 51.47], [55.27, 25.20]),
    risk_score: 8, congestion_score: 15, weather_score: 10, privacy_masking: false,
  },
  {
    id: "air-miami-bogota",
    label: "Miami ✈ Bogotá",
    mode: "air",
    origin: "miami",
    destination: "bogota",
    coordinates: arcPoints([-80.19, 25.76], [-74.07, 4.71]),
    risk_score: 12, congestion_score: 25, weather_score: 20, privacy_masking: true,
  },
  {
    id: "air-hk-tokyo",
    label: "Hong Kong ✈ Tokyo",
    mode: "air",
    origin: "hongkong",
    destination: "tokyo",
    coordinates: arcPoints([113.92, 22.31], [139.78, 35.55]),
    risk_score: 5, congestion_score: 10, weather_score: 8, privacy_masking: false,
  },
  {
    id: "air-hamburg-ny",
    label: "Hamburg ✈ New York",
    mode: "air",
    origin: "hamburg",
    destination: "newyork",
    coordinates: arcPoints([9.99, 53.55], [-74.01, 40.71]),
    risk_score: 7, congestion_score: 18, weather_score: 25, privacy_masking: false,
  },
];

// ── LAND ROUTES ─────────────────────────────────────────────
export const LAND_ROUTES: MapRoute[] = [
  {
    id: "land-rotterdam-hamburg",
    label: "Rotterdam → Hamburg",
    mode: "land",
    origin: "rotterdam",
    destination: "hamburg",
    coordinates: [
      [4.48, 51.92], [6.77, 51.23], [7.63, 51.96], [8.80, 52.50],
      [9.99, 53.55],
    ],
    risk_score: 3, congestion_score: 30, weather_score: 10, privacy_masking: false,
  },
  {
    id: "land-bogota-medellin",
    label: "Bogotá → Medellín",
    mode: "land",
    origin: "bogota",
    destination: "medellin",
    coordinates: [
      [-74.07, 4.71], [-74.80, 5.30], [-75.10, 5.80], [-75.56, 6.25],
    ],
    risk_score: 35, congestion_score: 40, weather_score: 30, privacy_masking: true,
  },
  {
    id: "land-medellin-cartagena",
    label: "Medellín → Cartagena",
    mode: "land",
    origin: "medellin",
    destination: "cartagena",
    coordinates: [
      [-75.56, 6.25], [-75.80, 7.00], [-75.60, 8.00], [-75.51, 10.39],
    ],
    risk_score: 40, congestion_score: 35, weather_score: 25, privacy_masking: true,
  },
  {
    id: "land-la-miami",
    label: "Los Angeles → Miami",
    mode: "land",
    origin: "losangeles",
    destination: "miami",
    coordinates: [
      [-118.24, 33.94], [-112.07, 33.45], [-104.99, 32.00], [-97.74, 30.27],
      [-95.36, 29.76], [-90.07, 29.95], [-87.62, 30.40], [-84.39, 30.44],
      [-82.46, 27.95], [-80.19, 25.76],
    ],
    risk_score: 5, congestion_score: 20, weather_score: 12, privacy_masking: false,
  },
];

// ── OPERATION CONDOR ROUTE (combined multi-modal) ───────────
export const OPERATION_CONDOR: MapRoute[] = [
  {
    id: "condor-1-land",
    label: "Condor Leg 1: Medellín → Cartagena",
    mode: "land",
    origin: "medellin",
    destination: "cartagena",
    coordinates: [
      [-75.56, 6.25], [-75.80, 7.00], [-75.60, 8.00], [-75.51, 10.39],
    ],
    risk_score: 40, congestion_score: 35, weather_score: 25, privacy_masking: true,
  },
  {
    id: "condor-2-sea",
    label: "Condor Leg 2: Cartagena → Panama",
    mode: "sea",
    origin: "cartagena",
    destination: "panama",
    coordinates: [
      [-75.51, 10.39], [-76.5, 10.0], [-78.0, 9.5], [-79.92, 9.08],
    ],
    risk_score: 18, congestion_score: 35, weather_score: 15, privacy_masking: true,
  },
  {
    id: "condor-3-sea",
    label: "Condor Leg 3: Panama → Miami",
    mode: "sea",
    origin: "panama",
    destination: "miami",
    coordinates: [
      [-79.92, 9.08], [-80.5, 12.0], [-81.0, 16.0], [-81.5, 20.0],
      [-80.5, 23.0], [-80.19, 25.76],
    ],
    risk_score: 10, congestion_score: 25, weather_score: 20, privacy_masking: true,
  },
];

// ── OVERLAY ZONES ───────────────────────────────────────────
export const OVERLAY_ZONES: OverlayZone[] = [
  { id: "oz-1", type: "weather",    label: "Tropical Storm Warning",     center: [-85.0, 18.0],   radiusKm: 300, severity: "high" },
  { id: "oz-2", type: "weather",    label: "Monsoon Season",             center: [95.0, 10.0],    radiusKm: 500, severity: "medium" },
  { id: "oz-3", type: "congestion", label: "Suez Approach Congestion",   center: [32.3, 30.5],    radiusKm: 150, severity: "high" },
  { id: "oz-4", type: "congestion", label: "Panama Canal Queue",         center: [-79.92, 9.08],  radiusKm: 80,  severity: "medium" },
  { id: "oz-5", type: "congestion", label: "Singapore Strait Congestion",center: [103.82, 1.35],  radiusKm: 100, severity: "high" },
  { id: "oz-6", type: "military",   label: "South China Sea Patrol Zone",center: [115.0, 12.0],   radiusKm: 400, severity: "critical" },
  { id: "oz-7", type: "military",   label: "Gulf of Aden Surveillance",  center: [48.0, 12.0],    radiusKm: 300, severity: "high" },
  { id: "oz-8", type: "warning",    label: "Piracy Risk Zone",           center: [50.0, 7.0],     radiusKm: 350, severity: "critical" },
  { id: "oz-9", type: "warning",    label: "Sanctions Zone",             center: [53.0, 33.0],    radiusKm: 250, severity: "high" },
];

// ── GeoJSON BUILDERS ────────────────────────────────────────
export function routesToGeoJSON(routes: MapRoute[]) {
  return {
    type: "FeatureCollection" as const,
    features: routes.map(r => ({
      type: "Feature" as const,
      properties: {
        id: r.id,
        label: r.label,
        mode: r.mode,
        risk_score: r.risk_score,
        congestion_score: r.congestion_score,
        weather_score: r.weather_score,
        privacy_masking: r.privacy_masking,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: r.coordinates,
      },
    })),
  };
}

export function hubsToGeoJSON(hubs: LogisticsHub[]) {
  return {
    type: "FeatureCollection" as const,
    features: hubs.map(h => ({
      type: "Feature" as const,
      properties: {
        id: h.id,
        name: h.name,
        type: h.type,
        country: h.country,
        region: h.region,
      },
      geometry: {
        type: "Point" as const,
        coordinates: h.coordinates,
      },
    })),
  };
}

export function zonesToGeoJSON(zones: OverlayZone[]) {
  // Approximate circle as 32-point polygon
  return {
    type: "FeatureCollection" as const,
    features: zones.map(z => {
      const pts = 32;
      const coords: [number, number][] = [];
      const kmToDeg = z.radiusKm / 111;
      for (let i = 0; i <= pts; i++) {
        const angle = (i / pts) * Math.PI * 2;
        coords.push([
          z.center[0] + kmToDeg * Math.cos(angle) / Math.cos(z.center[1] * Math.PI / 180),
          z.center[1] + kmToDeg * Math.sin(angle),
        ]);
      }
      return {
        type: "Feature" as const,
        properties: {
          id: z.id,
          type: z.type,
          label: z.label,
          severity: z.severity,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [coords],
        },
      };
    }),
  };
}
