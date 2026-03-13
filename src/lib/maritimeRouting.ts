// ============================================================
// Network-aware routing engine for logistics route planning
// Uses corridor-based pathfinding with maritime waypoints,
// land corridors, and air hubs to generate realistic routes
// that respect geographic constraints (ships can't cross land, etc.)
// ============================================================

export interface RoutingNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "port" | "canal" | "strait" | "ocean_wp" | "airport" | "land_hub" | "intermodal";
  modes: ("sea" | "air" | "land")[]; // which modes can access this node
}

interface RoutingEdge {
  from: string;
  to: string;
  mode: "sea" | "air" | "land";
  distance: number; // approximate nautical miles or km
}

// ── GLOBAL ROUTING NODES ────────────────────────────────────
// Maritime waypoints placed in navigable water to force routes
// around land masses and through real shipping corridors

const ROUTING_NODES: RoutingNode[] = [
  // ── Americas Pacific Coast ──
  { id: "buenaventura",  name: "Buenaventura",     lat: 3.88,   lng: -77.04,  type: "port",     modes: ["sea", "land"] },
  { id: "callao",        name: "Callao",           lat: -12.05, lng: -77.15,  type: "port",     modes: ["sea", "land"] },
  { id: "losangeles",    name: "Los Angeles",      lat: 33.74,  lng: -118.27, type: "port",     modes: ["sea", "land", "air"] },
  { id: "sanfrancisco",  name: "San Francisco",    lat: 37.80,  lng: -122.42, type: "port",     modes: ["sea", "land"] },
  { id: "vancouver",     name: "Vancouver",        lat: 49.29,  lng: -123.10, type: "port",     modes: ["sea", "land"] },
  { id: "manzanillo_mx", name: "Manzanillo MX",    lat: 19.05,  lng: -104.32, type: "port",     modes: ["sea", "land"] },

  // ── Panama Canal ──
  { id: "panama_pac",    name: "Panama (Pacific)",  lat: 8.95,  lng: -79.57,  type: "canal",    modes: ["sea"] },
  { id: "panama_atl",    name: "Panama (Atlantic)", lat: 9.35,  lng: -79.92,  type: "canal",    modes: ["sea"] },

  // ── Caribbean / Gulf ──
  { id: "cartagena",     name: "Cartagena",        lat: 10.39,  lng: -75.51,  type: "port",     modes: ["sea", "land"] },
  { id: "kingston",      name: "Kingston",         lat: 17.97,  lng: -76.79,  type: "port",     modes: ["sea"] },
  { id: "miami",         name: "Miami",            lat: 25.76,  lng: -80.19,  type: "port",     modes: ["sea", "land", "air"] },
  { id: "houston",       name: "Houston",          lat: 29.76,  lng: -95.36,  type: "port",     modes: ["sea", "land"] },

  // ── Americas Atlantic ──
  { id: "newyork",       name: "New York",         lat: 40.68,  lng: -74.00,  type: "port",     modes: ["sea", "land", "air"] },
  { id: "santos",        name: "Santos",           lat: -23.96, lng: -46.30,  type: "port",     modes: ["sea", "land"] },
  { id: "buenos_aires",  name: "Buenos Aires",     lat: -34.60, lng: -58.38,  type: "port",     modes: ["sea", "land"] },

  // ── Mid-Atlantic Ocean Waypoints (keep ships in water) ──
  { id: "atl_carib",     name: "Caribbean Atlantic",lat: 18.0,  lng: -65.0,   type: "ocean_wp", modes: ["sea"] },
  { id: "atl_mid_n",     name: "Mid-Atlantic North",lat: 38.0,  lng: -40.0,   type: "ocean_wp", modes: ["sea"] },
  { id: "atl_mid_s",     name: "Mid-Atlantic South",lat: 5.0,   lng: -25.0,   type: "ocean_wp", modes: ["sea"] },
  { id: "atl_azores",    name: "Azores",            lat: 38.7,  lng: -27.2,   type: "ocean_wp", modes: ["sea"] },

  // ── Europe ──
  { id: "rotterdam",     name: "Rotterdam",        lat: 51.92,  lng: 4.48,    type: "port",     modes: ["sea", "land"] },
  { id: "hamburg",       name: "Hamburg",           lat: 53.55,  lng: 9.99,    type: "port",     modes: ["sea", "land", "air"] },
  { id: "antwerp",       name: "Antwerp",           lat: 51.26,  lng: 4.40,    type: "port",     modes: ["sea", "land"] },
  { id: "london",        name: "London",            lat: 51.47,  lng: -0.46,   type: "port",     modes: ["sea", "land", "air"] },
  { id: "barcelona",     name: "Barcelona",         lat: 41.35,  lng: 2.17,    type: "port",     modes: ["sea", "land"] },
  { id: "genoa",         name: "Genoa",             lat: 44.41,  lng: 8.93,    type: "port",     modes: ["sea", "land"] },
  { id: "piraeus",       name: "Piraeus",           lat: 37.94,  lng: 23.64,   type: "port",     modes: ["sea", "land"] },
  { id: "le_havre",      name: "Le Havre",          lat: 49.49,  lng: 0.11,    type: "port",     modes: ["sea", "land"] },
  { id: "algeciras",     name: "Algeciras",         lat: 36.13,  lng: -5.45,   type: "port",     modes: ["sea", "land"] },
  { id: "english_ch",    name: "English Channel",   lat: 50.0,   lng: -1.0,    type: "ocean_wp", modes: ["sea"] },
  { id: "biscay",        name: "Bay of Biscay",     lat: 46.0,   lng: -5.0,    type: "ocean_wp", modes: ["sea"] },

  // ── Gibraltar ──
  { id: "gibraltar",     name: "Strait of Gibraltar",lat: 35.96, lng: -5.50,   type: "strait",   modes: ["sea"] },

  // ── Mediterranean ──
  { id: "med_west",      name: "Western Med",       lat: 37.5,  lng: 1.0,     type: "ocean_wp", modes: ["sea"] },
  { id: "med_central",   name: "Central Med",       lat: 36.0,  lng: 15.0,    type: "ocean_wp", modes: ["sea"] },
  { id: "med_east",      name: "Eastern Med",       lat: 34.0,  lng: 28.0,    type: "ocean_wp", modes: ["sea"] },

  // ── Suez ──
  { id: "suez_med",      name: "Suez (Med Side)",   lat: 31.26, lng: 32.31,   type: "canal",    modes: ["sea"] },
  { id: "suez_red",      name: "Suez (Red Sea)",    lat: 29.95, lng: 32.55,   type: "canal",    modes: ["sea"] },

  // ── Red Sea / Gulf of Aden ──
  { id: "red_sea_s",     name: "Bab el-Mandeb",     lat: 12.6,  lng: 43.3,    type: "strait",   modes: ["sea"] },
  { id: "aden",          name: "Gulf of Aden",       lat: 12.0,  lng: 48.0,    type: "ocean_wp", modes: ["sea"] },

  // ── Middle East ──
  { id: "dubai",         name: "Dubai / Jebel Ali", lat: 25.01,  lng: 55.06,   type: "port",     modes: ["sea", "land", "air"] },
  { id: "hormuz",        name: "Strait of Hormuz",  lat: 26.6,   lng: 56.5,    type: "strait",   modes: ["sea"] },

  // ── Indian Ocean ──
  { id: "arabian_sea",   name: "Arabian Sea",       lat: 15.0,  lng: 62.0,    type: "ocean_wp", modes: ["sea"] },
  { id: "mumbai",        name: "Mumbai",            lat: 19.08,  lng: 72.88,   type: "port",     modes: ["sea", "land", "air"] },
  { id: "colombo",       name: "Colombo",           lat: 6.93,   lng: 79.85,   type: "port",     modes: ["sea"] },
  { id: "indian_mid",    name: "Central Indian Ocean",lat: 0.0,  lng: 75.0,    type: "ocean_wp", modes: ["sea"] },

  // ── Malacca ──
  { id: "malacca_w",     name: "Malacca (West)",    lat: 4.0,   lng: 98.0,    type: "strait",   modes: ["sea"] },
  { id: "singapore",     name: "Singapore",         lat: 1.26,   lng: 103.85,  type: "port",     modes: ["sea", "land", "air"] },

  // ── South China Sea / East Asia ──
  { id: "scs_south",     name: "South China Sea S", lat: 5.0,   lng: 110.0,   type: "ocean_wp", modes: ["sea"] },
  { id: "scs_central",   name: "South China Sea C", lat: 14.0,  lng: 114.0,   type: "ocean_wp", modes: ["sea"] },
  { id: "hongkong",      name: "Hong Kong",         lat: 22.31,  lng: 113.92,  type: "port",     modes: ["sea", "air"] },
  { id: "shanghai",      name: "Shanghai",          lat: 31.23,  lng: 121.47,  type: "port",     modes: ["sea", "land", "air"] },
  { id: "busan",         name: "Busan",             lat: 35.10,  lng: 129.04,  type: "port",     modes: ["sea", "land"] },
  { id: "tokyo",         name: "Tokyo",             lat: 35.65,  lng: 139.75,  type: "port",     modes: ["sea", "land", "air"] },

  // ── Pacific Ocean Waypoints ──
  { id: "pac_nw",        name: "North Pacific W",   lat: 35.0,  lng: 155.0,   type: "ocean_wp", modes: ["sea"] },
  { id: "pac_mid",       name: "Mid Pacific",       lat: 35.0,  lng: 180.0,   type: "ocean_wp", modes: ["sea"] },
  { id: "pac_ne",        name: "North Pacific E",   lat: 38.0,  lng: -145.0,  type: "ocean_wp", modes: ["sea"] },
  { id: "pac_se",        name: "South Pacific E",   lat: -5.0,  lng: -100.0,  type: "ocean_wp", modes: ["sea"] },

  // ── Africa ──
  { id: "cape_town",     name: "Cape Town",         lat: -33.92, lng: 18.42,   type: "port",     modes: ["sea", "land"] },
  { id: "good_hope",     name: "Cape of Good Hope", lat: -34.5,  lng: 18.5,    type: "ocean_wp", modes: ["sea"] },
  { id: "mozambique_ch", name: "Mozambique Channel",lat: -18.0,  lng: 42.0,    type: "ocean_wp", modes: ["sea"] },
  { id: "w_africa",      name: "West Africa",       lat: 5.0,   lng: -5.0,    type: "ocean_wp", modes: ["sea"] },
  { id: "dakar",         name: "Dakar",             lat: 14.69,  lng: -17.44,  type: "port",     modes: ["sea", "land"] },

  // ── Colombia / Latin America inland ──
  { id: "bogota",        name: "Bogotá",            lat: 4.71,   lng: -74.07,  type: "land_hub", modes: ["land", "air"] },
  { id: "medellin",      name: "Medellín",          lat: 6.25,   lng: -75.56,  type: "land_hub", modes: ["land", "air"] },
  { id: "cali",          name: "Cali",              lat: 3.45,   lng: -76.53,  type: "land_hub", modes: ["land"] },
];

// ── ROUTING EDGES ───────────────────────────────────────────
// Each edge represents a navigable corridor between two nodes
// Distance is approximate for pathfinding weighting

function dist(a: RoutingNode, b: RoutingNode): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const nodeMap = new Map<string, RoutingNode>();
ROUTING_NODES.forEach(n => nodeMap.set(n.id, n));

function edge(from: string, to: string, mode: "sea" | "air" | "land"): RoutingEdge {
  const a = nodeMap.get(from)!;
  const b = nodeMap.get(to)!;
  return { from, to, mode, distance: dist(a, b) };
}

// Sea corridors
const SEA_EDGES: RoutingEdge[] = [
  // Pacific Americas
  edge("buenaventura", "panama_pac", "sea"),
  edge("callao", "buenaventura", "sea"),
  edge("callao", "panama_pac", "sea"),
  edge("buenaventura", "pac_se", "sea"),
  edge("pac_se", "panama_pac", "sea"),
  edge("losangeles", "pac_ne", "sea"),
  edge("sanfrancisco", "pac_ne", "sea"),
  edge("vancouver", "pac_ne", "sea"),
  edge("losangeles", "manzanillo_mx", "sea"),
  edge("manzanillo_mx", "panama_pac", "sea"),

  // Panama Canal
  edge("panama_pac", "panama_atl", "sea"),

  // Caribbean
  edge("panama_atl", "cartagena", "sea"),
  edge("panama_atl", "kingston", "sea"),
  edge("cartagena", "kingston", "sea"),
  edge("kingston", "miami", "sea"),
  edge("panama_atl", "miami", "sea"),
  edge("cartagena", "miami", "sea"),
  edge("miami", "houston", "sea"),
  edge("miami", "atl_carib", "sea"),
  edge("kingston", "atl_carib", "sea"),

  // Atlantic
  edge("miami", "newyork", "sea"),
  edge("atl_carib", "atl_mid_n", "sea"),
  edge("atl_carib", "atl_mid_s", "sea"),
  edge("newyork", "atl_mid_n", "sea"),
  edge("atl_mid_n", "atl_azores", "sea"),
  edge("atl_mid_s", "w_africa", "sea"),
  edge("atl_mid_s", "santos", "sea"),
  edge("santos", "buenos_aires", "sea"),
  edge("atl_mid_s", "buenos_aires", "sea"),
  edge("w_africa", "dakar", "sea"),
  edge("dakar", "atl_mid_s", "sea"),

  // North Atlantic to Europe
  edge("atl_azores", "english_ch", "sea"),
  edge("atl_azores", "biscay", "sea"),
  edge("atl_azores", "gibraltar", "sea"),
  edge("atl_mid_n", "english_ch", "sea"),
  edge("english_ch", "rotterdam", "sea"),
  edge("english_ch", "antwerp", "sea"),
  edge("english_ch", "london", "sea"),
  edge("english_ch", "le_havre", "sea"),
  edge("english_ch", "hamburg", "sea"),
  edge("biscay", "english_ch", "sea"),
  edge("biscay", "le_havre", "sea"),
  edge("biscay", "gibraltar", "sea"),
  edge("rotterdam", "hamburg", "sea"),
  edge("rotterdam", "antwerp", "sea"),
  edge("london", "rotterdam", "sea"),
  edge("london", "hamburg", "sea"),

  // Gibraltar & Med
  edge("gibraltar", "algeciras", "sea"),
  edge("gibraltar", "med_west", "sea"),
  edge("med_west", "barcelona", "sea"),
  edge("med_west", "genoa", "sea"),
  edge("med_west", "med_central", "sea"),
  edge("med_central", "med_east", "sea"),
  edge("med_central", "piraeus", "sea"),
  edge("med_east", "suez_med", "sea"),
  edge("piraeus", "suez_med", "sea"),

  // Suez
  edge("suez_med", "suez_red", "sea"),

  // Red Sea
  edge("suez_red", "red_sea_s", "sea"),
  edge("red_sea_s", "aden", "sea"),

  // Gulf / Middle East
  edge("aden", "arabian_sea", "sea"),
  edge("arabian_sea", "hormuz", "sea"),
  edge("hormuz", "dubai", "sea"),
  edge("arabian_sea", "mumbai", "sea"),
  edge("arabian_sea", "colombo", "sea"),
  edge("mumbai", "colombo", "sea"),

  // Indian Ocean to Malacca
  edge("colombo", "malacca_w", "sea"),
  edge("indian_mid", "malacca_w", "sea"),
  edge("colombo", "indian_mid", "sea"),
  edge("malacca_w", "singapore", "sea"),

  // South China Sea
  edge("singapore", "scs_south", "sea"),
  edge("scs_south", "scs_central", "sea"),
  edge("scs_central", "hongkong", "sea"),
  edge("hongkong", "shanghai", "sea"),
  edge("shanghai", "busan", "sea"),
  edge("busan", "tokyo", "sea"),

  // Trans-Pacific
  edge("tokyo", "pac_nw", "sea"),
  edge("busan", "pac_nw", "sea"),
  edge("shanghai", "pac_nw", "sea"),
  edge("pac_nw", "pac_mid", "sea"),
  edge("pac_mid", "pac_ne", "sea"),
  edge("pac_ne", "losangeles", "sea"),
  edge("pac_ne", "vancouver", "sea"),

  // Africa cape route
  edge("w_africa", "good_hope", "sea"),
  edge("good_hope", "cape_town", "sea"),
  edge("cape_town", "good_hope", "sea"),
  edge("good_hope", "mozambique_ch", "sea"),
  edge("mozambique_ch", "aden", "sea"),
  edge("aden", "dubai", "sea"),
];

// Land corridors
const LAND_EDGES: RoutingEdge[] = [
  // Colombia
  edge("bogota", "medellin", "land"),
  edge("bogota", "cali", "land"),
  edge("cali", "buenaventura", "land"),
  edge("medellin", "cartagena", "land"),
  edge("bogota", "buenaventura", "land"),

  // US
  edge("losangeles", "houston", "land"),
  edge("houston", "miami", "land"),
  edge("miami", "newyork", "land"),
  edge("newyork", "houston", "land"),
  edge("losangeles", "sanfrancisco", "land"),
  edge("sanfrancisco", "vancouver", "land"),

  // Europe
  edge("rotterdam", "hamburg", "land"),
  edge("rotterdam", "antwerp", "land"),
  edge("antwerp", "le_havre", "land"),
  edge("le_havre", "london", "land"),
  edge("rotterdam", "london", "land"),
  edge("hamburg", "genoa", "land"),
  edge("barcelona", "genoa", "land"),
  edge("genoa", "piraeus", "land"),
  edge("barcelona", "le_havre", "land"),
  edge("algeciras", "barcelona", "land"),

  // Asia
  edge("shanghai", "hongkong", "land"),
  edge("hongkong", "singapore", "land"),
  edge("mumbai", "dubai", "land"),
  edge("tokyo", "busan", "land"), // ferry treated as land
];

// Air corridors (major city pairs - all airports can connect)
const AIR_NODES = ROUTING_NODES.filter(n => n.modes.includes("air"));
const AIR_EDGES: RoutingEdge[] = [];
// For air, any two air-capable nodes can connect
for (let i = 0; i < AIR_NODES.length; i++) {
  for (let j = i + 1; j < AIR_NODES.length; j++) {
    AIR_EDGES.push(edge(AIR_NODES[i].id, AIR_NODES[j].id, "air"));
  }
}

// ── BUILD ADJACENCY LIST ────────────────────────────────────
type AdjList = Map<string, { to: string; distance: number; mode: "sea" | "air" | "land" }[]>;

function buildAdjList(mode: "sea" | "air" | "land" | "multimodal"): AdjList {
  const adj: AdjList = new Map();
  const addEdge = (e: RoutingEdge) => {
    if (!adj.has(e.from)) adj.set(e.from, []);
    if (!adj.has(e.to)) adj.set(e.to, []);
    adj.get(e.from)!.push({ to: e.to, distance: e.distance, mode: e.mode });
    adj.get(e.to)!.push({ to: e.from, distance: e.distance, mode: e.mode });
  };

  if (mode === "sea" || mode === "multimodal") SEA_EDGES.forEach(addEdge);
  if (mode === "land" || mode === "multimodal") LAND_EDGES.forEach(addEdge);
  if (mode === "air" || mode === "multimodal") AIR_EDGES.forEach(addEdge);

  return adj;
}

// ── A* PATHFINDING ──────────────────────────────────────────
function heuristic(a: RoutingNode, b: RoutingNode): number {
  return dist(a, b);
}

function findPath(
  fromId: string,
  toId: string,
  mode: "sea" | "air" | "land" | "multimodal"
): { path: RoutingNode[]; edgeModes: ("sea" | "air" | "land")[] } | null {
  const adj = buildAdjList(mode);
  const target = nodeMap.get(toId);
  if (!target) return null;

  const openSet = new Set<string>([fromId]);
  const cameFrom = new Map<string, string>();
  const edgeModeMap = new Map<string, "sea" | "air" | "land">();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  gScore.set(fromId, 0);
  const fromNode = nodeMap.get(fromId);
  if (!fromNode) return null;
  fScore.set(fromId, heuristic(fromNode, target));

  while (openSet.size > 0) {
    // Get node with lowest fScore
    let current = "";
    let lowestF = Infinity;
    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < lowestF) { lowestF = f; current = id; }
    }

    if (current === toId) {
      // Reconstruct path
      const path: RoutingNode[] = [];
      const modes: ("sea" | "air" | "land")[] = [];
      let c = current;
      while (c) {
        path.unshift(nodeMap.get(c)!);
        const prev = cameFrom.get(c);
        if (prev) modes.unshift(edgeModeMap.get(c)!);
        c = prev!;
      }
      return { path, edgeModes: modes };
    }

    openSet.delete(current);
    const neighbors = adj.get(current) || [];

    for (const neighbor of neighbors) {
      const tentG = (gScore.get(current) ?? Infinity) + neighbor.distance;
      if (tentG < (gScore.get(neighbor.to) ?? Infinity)) {
        cameFrom.set(neighbor.to, current);
        edgeModeMap.set(neighbor.to, neighbor.mode);
        gScore.set(neighbor.to, tentG);
        const nNode = nodeMap.get(neighbor.to);
        fScore.set(neighbor.to, tentG + (nNode ? heuristic(nNode, target) : 0));
        openSet.add(neighbor.to);
      }
    }
  }

  return null; // No path found
}

// ── SNAP TO NEAREST NODE ────────────────────────────────────
function snapToNode(lat: number, lng: number, mode: "sea" | "air" | "land" | "multimodal"): RoutingNode | null {
  const modeFilter = mode === "multimodal" ? undefined : mode;
  let best: RoutingNode | null = null;
  let bestDist = Infinity;

  for (const node of ROUTING_NODES) {
    if (modeFilter && !node.modes.includes(modeFilter)) continue;
    const d = dist({ lat, lng } as any, node);
    if (d < bestDist) {
      bestDist = d;
      best = node;
    }
  }
  return best;
}

// ── SMOOTH PATH for rendering ───────────────────────────────
// Interpolates between waypoints with gentle curves
function smoothSegment(from: [number, number], to: [number, number], mode: "sea" | "air" | "land", numPts = 20): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const lng = from[0] + (to[0] - from[0]) * t;
    const lat = from[1] + (to[1] - from[1]) * t;
    // Gentle curvature for sea/air, minimal for land
    const curveMag = mode === "land" ? 0.01 : 0.03;
    const curve = Math.sin(t * Math.PI) * (Math.abs(to[0] - from[0]) * curveMag);
    pts.push([lng, lat + curve]);
  }
  return pts;
}

// ── PUBLIC API ──────────────────────────────────────────────

export interface RoutedPath {
  coordinates: [number, number][];
  waypoints: { name: string; lat: number; lng: number; type: string; isTransfer: boolean; mode?: string }[];
  segments: { from: string; to: string; mode: "sea" | "air" | "land"; coordinates: [number, number][] }[];
  totalDistanceKm: number;
  feasible: boolean;
  message?: string;
  suggestedMode?: "sea" | "air" | "land" | "multimodal";
}

export function generateNetworkRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: "sea" | "air" | "land" | "multimodal",
  fromName?: string,
  toName?: string,
): RoutedPath {
  // Snap to nearest network nodes
  const startNode = snapToNode(fromLat, fromLng, mode);
  const endNode = snapToNode(toLat, toLng, mode);

  if (!startNode || !endNode) {
    // Try multimodal if single mode fails
    if (mode !== "multimodal") {
      const mmStart = snapToNode(fromLat, fromLng, "multimodal");
      const mmEnd = snapToNode(toLat, toLng, "multimodal");
      return {
        coordinates: [],
        waypoints: [],
        segments: [],
        totalDistanceKm: 0,
        feasible: false,
        message: `No ${mode} access found near ${fromName || "origin"} or ${toName || "destination"}. ${mmStart && mmEnd ? "Try Multimodal mode." : ""}`,
        suggestedMode: "multimodal",
      };
    }
    return {
      coordinates: [], waypoints: [], segments: [], totalDistanceKm: 0, feasible: false,
      message: "No routing nodes found near origin or destination.",
    };
  }

  // Find path through network
  const result = findPath(startNode.id, endNode.id, mode);

  if (!result) {
    // Suggest multimodal
    if (mode !== "multimodal") {
      const mmResult = findPath(startNode.id, endNode.id, "multimodal");
      return {
        coordinates: [], waypoints: [], segments: [], totalDistanceKm: 0, feasible: false,
        message: `No feasible ${mode}-only route from ${startNode.name} to ${endNode.name}. ${mmResult ? "A multimodal route is available." : "No route found."}`,
        suggestedMode: mmResult ? "multimodal" : undefined,
      };
    }
    return {
      coordinates: [], waypoints: [], segments: [], totalDistanceKm: 0, feasible: false,
      message: `No route found from ${startNode.name} to ${endNode.name} through any transport mode.`,
    };
  }

  // Build smooth coordinates through path
  const allCoords: [number, number][] = [];
  const routeSegments: RoutedPath["segments"] = [];
  let totalDist = 0;

  // Add initial approach from actual origin to first network node
  const originCoord: [number, number] = [fromLng, fromLat];
  const firstNodeCoord: [number, number] = [result.path[0].lng, result.path[0].lat];
  if (dist({ lat: fromLat, lng: fromLng } as any, result.path[0]) > 10) {
    const approachMode = result.path[0].modes.includes("land") ? "land" : mode === "air" ? "air" : "land";
    const approachPts = smoothSegment(originCoord, firstNodeCoord, approachMode, 10);
    allCoords.push(...approachPts);
    routeSegments.push({ from: fromName || "Origin", to: result.path[0].name, mode: approachMode, coordinates: approachPts });
  }

  // Build segments through network path
  for (let i = 0; i < result.path.length - 1; i++) {
    const a = result.path[i];
    const b = result.path[i + 1];
    const segMode = result.edgeModes[i];
    const from: [number, number] = [a.lng, a.lat];
    const to: [number, number] = [b.lng, b.lat];
    const pts = smoothSegment(from, to, segMode, 15);
    // Avoid duplicating the first point
    if (allCoords.length > 0) pts.shift();
    allCoords.push(...pts);
    totalDist += dist(a, b);
    routeSegments.push({ from: a.name, to: b.name, mode: segMode, coordinates: pts });
  }

  // Add final approach to actual destination
  const lastNode = result.path[result.path.length - 1];
  const destCoord: [number, number] = [toLng, toLat];
  if (dist({ lat: toLat, lng: toLng } as any, lastNode) > 10) {
    const approachMode = lastNode.modes.includes("land") ? "land" : mode === "air" ? "air" : "land";
    const approachPts = smoothSegment([lastNode.lng, lastNode.lat], destCoord, approachMode, 10);
    approachPts.shift();
    allCoords.push(...approachPts);
    routeSegments.push({ from: lastNode.name, to: toName || "Destination", mode: approachMode, coordinates: approachPts });
  }

  // Build waypoints list
  const waypoints = result.path.map((n, i) => ({
    name: n.name,
    lat: n.lat,
    lng: n.lng,
    type: n.type,
    isTransfer: i > 0 && i < result.path.length - 1 && result.edgeModes[i] !== result.edgeModes[i - 1],
    mode: i < result.edgeModes.length ? result.edgeModes[i] : undefined,
  }));

  return {
    coordinates: allCoords,
    waypoints,
    segments: routeSegments,
    totalDistanceKm: Math.round(totalDist),
    feasible: true,
  };
}

export { ROUTING_NODES, nodeMap };
