import { useRef, useEffect, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  HUBS, SEA_ROUTES, AIR_ROUTES, LAND_ROUTES, OPERATION_CONDOR,
  OVERLAY_ZONES, routesToGeoJSON, hubsToGeoJSON, zonesToGeoJSON,
} from "@/lib/creatorMapData";
import { type HandoffCheckpoint, checkpointsToGeoJSON, checkpointsToFlowGeoJSON } from "@/lib/handoffData";
import { AlertTriangle } from "lucide-react";

// Free dark vector tiles from CartoCDN (no API key needed)
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: "Orchestra Dark",
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://carto.com">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    },
    "carto-labels": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: "carto-dark-layer",
      type: "raster",
      source: "carto-dark",
      paint: {
        "raster-saturation": -0.6,
        "raster-brightness-max": 0.45,
        "raster-contrast": 0.15,
      },
    },
    {
      id: "carto-labels-layer",
      type: "raster",
      source: "carto-labels",
      paint: {
        "raster-opacity": 0.6,
      },
    },
  ],
};

interface CreatorMapProps {
  layers: { sea: boolean; air: boolean; land: boolean; combined: boolean };
  overlays: { weather: boolean; military: boolean; congestion: boolean; warnings: boolean };
  sensitivity: string;
  hideCounterparties: boolean;
  checkpoints?: HandoffCheckpoint[];
  onCheckpointClick?: (id: string) => void;
}

export default function CreatorMap({ layers, overlays, sensitivity, hideCounterparties, checkpoints = [], onCheckpointClick }: CreatorMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Build the map once
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [30, 20],
      zoom: 2,
      minZoom: 1.5,
      maxZoom: 12,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    map.on("error", () => setLoadError(true));

    map.on("load", () => {
      mapRef.current = map;

      // ── Add data sources ───────────────────────────────
      map.addSource("sea-routes", { type: "geojson", data: routesToGeoJSON(SEA_ROUTES) });
      map.addSource("air-routes", { type: "geojson", data: routesToGeoJSON(AIR_ROUTES) });
      map.addSource("land-routes", { type: "geojson", data: routesToGeoJSON(LAND_ROUTES) });
      map.addSource("condor-routes", { type: "geojson", data: routesToGeoJSON(OPERATION_CONDOR) });
      map.addSource("hubs", { type: "geojson", data: hubsToGeoJSON(HUBS) });

      // Overlay zones by type
      const weatherZones = OVERLAY_ZONES.filter(z => z.type === "weather");
      const congestionZones = OVERLAY_ZONES.filter(z => z.type === "congestion");
      const militaryZones = OVERLAY_ZONES.filter(z => z.type === "military");
      const warningZones = OVERLAY_ZONES.filter(z => z.type === "warning");
      map.addSource("weather-zones", { type: "geojson", data: zonesToGeoJSON(weatherZones) });
      map.addSource("congestion-zones", { type: "geojson", data: zonesToGeoJSON(congestionZones) });
      map.addSource("military-zones", { type: "geojson", data: zonesToGeoJSON(militaryZones) });
      map.addSource("warning-zones", { type: "geojson", data: zonesToGeoJSON(warningZones) });

      // ── OVERLAY LAYERS (behind routes) ─────────────────
      map.addLayer({
        id: "weather-fill", type: "fill", source: "weather-zones",
        paint: { "fill-color": "#3b82f6", "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "weather-border", type: "line", source: "weather-zones",
        paint: { "line-color": "#3b82f6", "line-width": 1, "line-opacity": 0.4, "line-dasharray": [3, 3] },
      });
      map.addLayer({
        id: "congestion-fill", type: "fill", source: "congestion-zones",
        paint: { "fill-color": "#eab308", "fill-opacity": 0.10 },
      });
      map.addLayer({
        id: "congestion-border", type: "line", source: "congestion-zones",
        paint: { "line-color": "#eab308", "line-width": 1, "line-opacity": 0.4, "line-dasharray": [3, 3] },
      });
      map.addLayer({
        id: "military-fill", type: "fill", source: "military-zones",
        paint: { "fill-color": "#f97316", "fill-opacity": 0.10 },
      });
      map.addLayer({
        id: "military-border", type: "line", source: "military-zones",
        paint: { "line-color": "#f97316", "line-width": 1.5, "line-opacity": 0.5, "line-dasharray": [4, 2] },
      });
      map.addLayer({
        id: "warning-fill", type: "fill", source: "warning-zones",
        paint: { "fill-color": "#ef4444", "fill-opacity": 0.10 },
      });
      map.addLayer({
        id: "warning-border", type: "line", source: "warning-zones",
        paint: { "line-color": "#ef4444", "line-width": 1.5, "line-opacity": 0.5, "line-dasharray": [2, 2] },
      });

      // ── SEA ROUTE LAYERS ──────────────────────────────
      map.addLayer({
        id: "sea-glow", type: "line", source: "sea-routes",
        paint: { "line-color": "#3b82f6", "line-width": 6, "line-opacity": 0.15, "line-blur": 4 },
      });
      map.addLayer({
        id: "sea-line", type: "line", source: "sea-routes",
        paint: { "line-color": "#3b82f6", "line-width": 2, "line-opacity": 0.7, "line-dasharray": [6, 4] },
      });

      // ── AIR ROUTE LAYERS ──────────────────────────────
      map.addLayer({
        id: "air-glow", type: "line", source: "air-routes",
        paint: { "line-color": "#a855f7", "line-width": 5, "line-opacity": 0.12, "line-blur": 4 },
      });
      map.addLayer({
        id: "air-line", type: "line", source: "air-routes",
        paint: { "line-color": "#a855f7", "line-width": 1.5, "line-opacity": 0.7, "line-dasharray": [3, 6] },
      });

      // ── LAND ROUTE LAYERS ─────────────────────────────
      map.addLayer({
        id: "land-glow", type: "line", source: "land-routes",
        paint: { "line-color": "#22c55e", "line-width": 5, "line-opacity": 0.12, "line-blur": 3 },
      });
      map.addLayer({
        id: "land-line", type: "line", source: "land-routes",
        paint: { "line-color": "#22c55e", "line-width": 2, "line-opacity": 0.7 },
      });

      // ── CONDOR ROUTE (combined) ───────────────────────
      map.addLayer({
        id: "condor-glow", type: "line", source: "condor-routes",
        paint: { "line-color": "#f59e0b", "line-width": 8, "line-opacity": 0.15, "line-blur": 5 },
      });
      map.addLayer({
        id: "condor-line", type: "line", source: "condor-routes",
        paint: { "line-color": "#f59e0b", "line-width": 2.5, "line-opacity": 0.85, "line-dasharray": [4, 2] },
      });

      // ── HUB MARKERS ──────────────────────────────────
      map.addLayer({
        id: "hub-outer", type: "circle", source: "hubs",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 5, 6, 9, 10, 14],
          "circle-color": "transparent",
          "circle-stroke-color": [
            "match", ["get", "type"],
            "port", "#3b82f6",
            "airport", "#a855f7",
            "hub", "#f59e0b",
            "#3b82f6"
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-opacity": 0.6,
        },
      });
      map.addLayer({
        id: "hub-inner", type: "circle", source: "hubs",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 6, 4.5, 10, 7],
          "circle-color": [
            "match", ["get", "type"],
            "port", "#3b82f6",
            "airport", "#a855f7",
            "hub", "#f59e0b",
            "#3b82f6"
          ],
          "circle-opacity": 0.85,
        },
      });
      map.addLayer({
        id: "hub-labels", type: "symbol", source: "hubs",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 2, 0, 3, 9, 6, 11, 10, 13],
          "text-offset": [0, 1.3],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": "#94a3b8",
          "text-halo-color": "rgba(10, 15, 30, 0.85)",
          "text-halo-width": 1.5,
        },
      });

      // ── HOVER INTERACTIONS ────────────────────────────
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: "orchestra-popup" });

      for (const layerId of ["hub-inner", "sea-line", "air-line", "land-line", "condor-line"]) {
        map.on("mouseenter", layerId, (e) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (!f) return;
          const props = f.properties;
          const html = props.name
            ? `<strong>${props.name}</strong><br/><span style="opacity:0.7">${props.type} • ${props.country}</span>`
            : `<strong>${props.label}</strong><br/><span style="opacity:0.7">${props.mode} • Risk: ${props.risk_score}%</span>`;
          popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      }

      setMapLoaded(true);
    });

    return () => { map.remove(); };
  }, []);

  // ── TOGGLE VISIBILITY reactively ──────────────────────────
  const setVisibility = useCallback((ids: string[], visible: boolean) => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    ids.forEach(id => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      }
    });
  }, [mapLoaded]);

  useEffect(() => { setVisibility(["sea-glow", "sea-line"], layers.sea); }, [layers.sea, setVisibility]);
  useEffect(() => { setVisibility(["air-glow", "air-line"], layers.air); }, [layers.air, setVisibility]);
  useEffect(() => { setVisibility(["land-glow", "land-line"], layers.land); }, [layers.land, setVisibility]);
  useEffect(() => { setVisibility(["condor-glow", "condor-line"], layers.combined); }, [layers.combined, setVisibility]);

  useEffect(() => { setVisibility(["weather-fill", "weather-border"], overlays.weather); }, [overlays.weather, setVisibility]);
  useEffect(() => { setVisibility(["congestion-fill", "congestion-border"], overlays.congestion); }, [overlays.congestion, setVisibility]);
  useEffect(() => { setVisibility(["military-fill", "military-border"], overlays.military); }, [overlays.military, setVisibility]);
  useEffect(() => { setVisibility(["warning-fill", "warning-border"], overlays.warnings); }, [overlays.warnings, setVisibility]);

  // Privacy: adjust label visibility based on sensitivity
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (map.getLayer("hub-labels")) {
      const size = sensitivity === "high" ? 0 : sensitivity === "medium" ? 9 : 11;
      map.setPaintProperty("hub-labels", "text-opacity", sensitivity === "high" ? 0.3 : 1);
    }
  }, [sensitivity, mapLoaded]);

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background gap-3">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-xs font-mono text-muted-foreground">MAP TILES FAILED TO LOAD</p>
        <p className="text-[10px] text-muted-foreground/60">Check your connection and try refreshing</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ background: "hsl(222, 47%, 4%)" }} />
  );
}
