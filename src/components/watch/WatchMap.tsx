import { useRef, useEffect, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AlertTriangle } from "lucide-react";
import type { WatchShipment } from "@/lib/watchModeData";
import {
  shipmentsToRoutesGeoJSON,
  shipmentsToPositionsGeoJSON,
  shipmentsToEndpointsGeoJSON,
} from "@/lib/watchModeData";

const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: "Watch Dark",
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://carto.com">CARTO</a>',
    },
    "carto-labels": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
    },
  },
  layers: [
    { id: "dark-base", type: "raster", source: "carto-dark", paint: { "raster-saturation": -0.6, "raster-brightness-max": 0.45 } },
    { id: "labels", type: "raster", source: "carto-labels", paint: { "raster-opacity": 0.6 } },
  ],
};

interface WatchMapProps {
  shipments: WatchShipment[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  privacyMode: boolean;
}

export default function WatchMap({ shipments, selectedId, onSelect, privacyMode }: WatchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [20, 20],
      zoom: 2,
      minZoom: 1.5,
      maxZoom: 12,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("error", () => setLoadError(true));

    map.on("load", () => {
      mapRef.current = map;

      // Sources
      map.addSource("watch-routes", { type: "geojson", data: shipmentsToRoutesGeoJSON(shipments) });
      map.addSource("watch-positions", { type: "geojson", data: shipmentsToPositionsGeoJSON(shipments) });
      map.addSource("watch-endpoints", { type: "geojson", data: shipmentsToEndpointsGeoJSON(shipments) });

      // Route glow
      map.addLayer({
        id: "route-glow", type: "line", source: "watch-routes",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 6,
          "line-opacity": 0.15,
          "line-blur": 4,
        },
      });

      // Route line
      map.addLayer({
        id: "route-line", type: "line", source: "watch-routes",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2,
          "line-opacity": 0.6,
          "line-dasharray": [4, 3],
        },
      });

      // Endpoint markers
      map.addLayer({
        id: "endpoints", type: "circle", source: "watch-endpoints",
        paint: {
          "circle-radius": 4,
          "circle-color": "transparent",
          "circle-stroke-color": "#94a3b8",
          "circle-stroke-width": 1,
          "circle-stroke-opacity": 0.5,
        },
      });

      // Endpoint labels
      map.addLayer({
        id: "endpoint-labels", type: "symbol", source: "watch-endpoints",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 2, 0, 3, 9, 6, 11],
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": "#94a3b8",
          "text-halo-color": "rgba(10,15,30,0.85)",
          "text-halo-width": 1.5,
        },
      });

      // Position outer ring (alert indicator)
      map.addLayer({
        id: "pos-ring", type: "circle", source: "watch-positions",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 8, 6, 14],
          "circle-color": "transparent",
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-width": ["case", [">=", ["get", "alert_count"], 1], 2, 1],
          "circle-stroke-opacity": 0.6,
        },
      });

      // Position dot
      map.addLayer({
        id: "pos-dot", type: "circle", source: "watch-positions",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 4, 6, 7],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.9,
        },
      });

      // Position labels
      map.addLayer({
        id: "pos-labels", type: "symbol", source: "watch-positions",
        layout: {
          "text-field": ["get", "reference"],
          "text-font": ["Open Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 2, 0, 4, 9, 8, 11],
          "text-offset": [0, -1.5],
          "text-anchor": "bottom",
          "text-optional": true,
        },
        paint: {
          "text-color": ["get", "color"],
          "text-halo-color": "rgba(10,15,30,0.9)",
          "text-halo-width": 1.5,
        },
      });

      // Click handler
      map.on("click", "pos-dot", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) onSelect(id);
      });
      map.on("mouseenter", "pos-dot", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "pos-dot", () => { map.getCanvas().style.cursor = ""; });

      // Hover popup
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: "orchestra-popup" });
      map.on("mouseenter", "pos-dot", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties;
        popup.setLngLat(e.lngLat).setHTML(
          `<strong>${p.reference}</strong><br/><span style="opacity:0.7">${p.mode} • Risk ${p.risk_score}%</span>`
        ).addTo(map);
      });
      map.on("mouseleave", "pos-dot", () => popup.remove());

      setReady(true);
    });

    return () => map.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update data reactively
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const routeSrc = map.getSource("watch-routes") as maplibregl.GeoJSONSource;
    const posSrc = map.getSource("watch-positions") as maplibregl.GeoJSONSource;
    const endSrc = map.getSource("watch-endpoints") as maplibregl.GeoJSONSource;
    if (routeSrc) routeSrc.setData(shipmentsToRoutesGeoJSON(shipments));
    if (posSrc) posSrc.setData(shipmentsToPositionsGeoJSON(shipments));
    if (endSrc) endSrc.setData(shipmentsToEndpointsGeoJSON(shipments));
  }, [shipments, ready]);

  // Privacy mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (map.getLayer("pos-labels")) {
      map.setPaintProperty("pos-labels", "text-opacity", privacyMode ? 0.3 : 1);
    }
    if (map.getLayer("endpoint-labels")) {
      map.setPaintProperty("endpoint-labels", "text-opacity", privacyMode ? 0.2 : 1);
    }
  }, [privacyMode, ready]);

  // Highlight selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (map.getLayer("route-line")) {
      map.setPaintProperty("route-line", "line-opacity", [
        "case",
        selectedId ? ["==", ["get", "id"], selectedId] : ["literal", true],
        0.8,
        selectedId ? 0.2 : 0.6,
      ]);
    }
    if (map.getLayer("route-glow")) {
      map.setPaintProperty("route-glow", "line-opacity", [
        "case",
        selectedId ? ["==", ["get", "id"], selectedId] : ["literal", true],
        0.25,
        selectedId ? 0.05 : 0.15,
      ]);
    }
  }, [selectedId, ready]);

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background gap-3">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-xs font-mono text-muted-foreground">MAP TILES FAILED TO LOAD</p>
      </div>
    );
  }

  return <div ref={containerRef} className="absolute inset-0" style={{ background: "hsl(222, 47%, 4%)" }} />;
}
