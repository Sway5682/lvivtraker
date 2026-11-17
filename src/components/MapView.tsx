import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import type { Vehicle, StopInfo, Selection } from "../types";
import { LVIV_CENTER, STOPS, getRoute, ROUTES } from "../data/lviv";
import { getRouteShape } from "../data/api";

interface Props {
  vehicles: Vehicle[];
  selectedRouteIds: Set<string>;
  selected: Selection | null;
  onSelectVehicle: (id: string) => void;
  onSelectStop: (id: string) => void;
  followUser: boolean;
  userLocation: [number, number] | null;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function vehicleDivIcon(v: Vehicle, selected: boolean): L.DivIcon {
  const shadow = selected ? "0 0 0 4px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.6)" : "0 2px 8px rgba(0,0,0,0.5)";
  const scale = selected ? 1.15 : 1;
  const arrow = `<div style="transform: rotate(${v.bearing}deg); margin-left:3px;">▶</div>`;
  const html = `
    <div style="
      display:flex; align-items:center; gap:2px;
      background:${v.color}; color:#fff;
      padding:3px 8px 3px 7px; border-radius:999px;
      font-weight:700; font-size:13px; line-height:1;
      font-family: system-ui, sans-serif;
      box-shadow:${shadow};
      transform: scale(${scale});
      transition: transform 0.2s;
      white-space:nowrap;
    ">
      <span>${v.routeShortName}</span>${arrow}
    </div>`;
  return L.divIcon({
    className: "vehicle-marker",
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function stopDivIcon(s: StopInfo, selected: boolean): L.DivIcon {
  const size = selected ? 16 : 10;
  const ring = selected
    ? `<div style="position:absolute;inset:-6px;border:2px solid #60a5fa;border-radius:50%;animation:pulse-ring 1.5s ease-out infinite;"></div>`
    : "";
  const html = `${ring}<div style="width:${size}px;height:${size}px;background:#e2e8f0;border:2px solid #475569;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`;
  return L.divIcon({
    className: "stop-marker",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function userDivIcon(): L.DivIcon {
  const html = `
    <div style="position:relative;width:24px;height:24px;">
      <div style="position:absolute;inset:-12px;background:rgba(59,130,246,0.2);border-radius:50%;animation:pulse-user 2s ease-out infinite;"></div>
      <div style="position:absolute;inset:0;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>
    </div>`;
  return L.divIcon({ className: "user-marker", html, iconSize: [24, 24], iconAnchor: [12, 12] });
}

export default function MapView({
  vehicles,
  selectedRouteIds,
  selected,
  onSelectVehicle,
  onSelectStop,
  followUser,
  userLocation,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const stopMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const bgRoutesRef = useRef<L.LayerGroup | null>(null);
  const onSelectVehicleRef = useRef(onSelectVehicle);
  const onSelectStopRef = useRef(onSelectStop);

  useEffect(() => {
    onSelectVehicleRef.current = onSelectVehicle;
    onSelectStopRef.current = onSelectStop;
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: LVIV_CENTER,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    });
    const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      subdomains: "abc",
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    (tileLayer.getContainer() as HTMLElement).style.filter =
      "invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)";
    L.control.zoom({ position: "bottomright" }).addTo(map);

    for (const stop of STOPS) {
      const marker = L.marker(stop.location, {
        icon: stopDivIcon(stop, false),
        zIndexOffset: 50,
        keyboard: false,
      }).addTo(map);
      marker.on("click", () => onSelectStopRef.current(stop.id));
      marker.bindTooltip(stop.name, {
        direction: "top",
        offset: [0, -8],
        className: "lviv-tooltip",
      });
      stopMarkersRef.current.set(stop.id, marker);
    }

    const bgGroup = L.layerGroup().addTo(map);
    for (const route of ROUTES) {
      if (route.shape.length > 1) {
        L.polyline(route.shape, {
          color: route.color,
          weight: 2.5,
          opacity: 0.25,
          lineCap: "round",
        }).addTo(bgGroup);
      }
    }
    bgRoutesRef.current = bgGroup;

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const visibleVehicles = useMemo(() => {
    if (selectedRouteIds.size === 0) return vehicles;
    return vehicles.filter((v) => selectedRouteIds.has(v.routeId));
  }, [vehicles, selectedRouteIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const existing = vehicleMarkersRef.current;
    const seen = new Set<string>();

    for (const v of visibleVehicles) {
      seen.add(v.id);
      const isSelected = selected?.kind === "vehicle" && selected.id === v.id;
      let marker = existing.get(v.id);

      if (!marker) {
        marker = L.marker([v.lat, v.lng], {
          icon: vehicleDivIcon(v, isSelected),
          zIndexOffset: 200,
          keyboard: false,
        }).addTo(map);
        marker.on("click", () => onSelectVehicleRef.current(v.id));
        existing.set(v.id, marker);
      } else {
        const cur = marker.getLatLng();
        const newLat = lerp(cur.lat, v.lat, 0.3);
        const newLng = lerp(cur.lng, v.lng, 0.3);
        marker.setLatLng([newLat, newLng]);
        marker.setIcon(vehicleDivIcon(v, isSelected));
      }
    }

    for (const [id, marker] of existing) {
      if (!seen.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }
  }, [visibleVehicles, selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const [id, marker] of stopMarkersRef.current) {
      const isSelected = selected?.kind === "stop" && selected.id === id;
      marker.setIcon(stopDivIcon(STOPS.find((s) => s.id === id) as StopInfo, isSelected));
    }
  }, [selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    if (bgRoutesRef.current) {
      bgRoutesRef.current.eachLayer((layer) => {
        if (layer instanceof L.Polyline) {
          layer.setStyle({ opacity: selectedRouteIds.size > 0 ? 0.08 : 0.25 });
        }
      });
    }
    if (selectedRouteIds.size > 0) {
      const firstId = selectedRouteIds.values().next().value;
      if (!firstId) return;
      const route = getRoute(firstId);
      const shape = getRouteShape(firstId);
      if (route && shape && shape.length > 1) {
        routeLayerRef.current = L.polyline(shape, {
          color: route.color,
          weight: 5,
          opacity: 0.85,
          lineCap: "round",
        }).addTo(map);
      }
    }
  }, [selectedRouteIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    if (userLocation) {
      userMarkerRef.current = L.marker(userLocation, {
        icon: userDivIcon(),
        zIndexOffset: 500,
        keyboard: false,
      }).addTo(map);
      if (followUser) map.panTo(userLocation, { animate: true });
    }
  }, [userLocation, followUser]);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
}
