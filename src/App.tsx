import { useState, useEffect, useCallback, useRef } from "react";
import type { Vehicle, FilterType, Selection, StopArrival } from "./types";
import { fetchVehicles, fetchStopArrivals } from "./data/api";
import { useEdgeFunction, type FeedStatus } from "./data/live";
import { getRoute, getStop } from "./data/lviv";
import { X } from "lucide-react";
import MapView from "./components/MapView";
import TopBar, { matchesFilter } from "./components/TopBar";
import { VehicleSheet, StopSheet } from "./components/BottomSheet";
import { useFavorites } from "./hooks/useFavorites";

export default function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Selection | null>(null);
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set());
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [followUser, setFollowUser] = useState(false);
  const [arrivals, setArrivals] = useState<StopArrival[]>([]);
  const [arrivalsLoading, setArrivalsLoading] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const watchIdRef = useRef<number | null>(null);
  const { favorites, toggle, isFavorite } = useFavorites();
  const edgeStatus = useEdgeFunction();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { vehicles: v, fetchedAt } = await fetchVehicles();
      if (!cancelled) {
        setVehicles(v);
        setLastFetchAt(fetchedAt);
      }
    }
    load();
    const interval = window.setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const selectedVehicle = selected?.kind === "vehicle"
    ? vehicles.find((v) => v.id === selected.id) ?? null
    : null;
  const selectedStop = selected?.kind === "stop"
    ? getStop(selected.id) ?? null
    : null;

  useEffect(() => {
    if (selected?.kind !== "stop" || !selectedStop) {
      setArrivals([]);
      return;
    }
    let cancelled = false;
    setArrivalsLoading(true);
    async function loadArrivals(stopId: string) {
      const a = await fetchStopArrivals(stopId);
      if (!cancelled) {
        setArrivals(a);
        setArrivalsLoading(false);
      }
    }
    loadArrivals(selected.id);
    const interval = window.setInterval(() => loadArrivals(selected.id), 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selected, selectedStop]);

  const freshData = lastFetchAt !== null && now - lastFetchAt < 15000;
  const status: FeedStatus =
    edgeStatus === "offline" || (!freshData && lastFetchAt === null)
      ? "offline"
      : freshData
        ? "live"
        : "connecting";

  const filteredVehicles = vehicles.filter((v) => {
    if (selectedRouteIds.size > 0 && !selectedRouteIds.has(v.routeId)) return false;
    return matchesFilter(v.type, filter, isFavorite(v.id));
  });

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setFollowUser(true);
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => setFollowUser(false),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  function handleSelectVehicle(id: string) {
    setSelected({ kind: "vehicle", id });
  }

  function handleSelectStop(id: string) {
    setSelected({ kind: "stop", id });
  }

  function handleShowRoute() {
    if (selectedVehicle) {
      setSelectedRouteIds(new Set([selectedVehicle.routeId]));
      setSelected(null);
    }
  }

  function handleToggleFavorite() {
    if (!selectedVehicle) return;
    toggle({
      id: selectedVehicle.id,
      routeShortName: selectedVehicle.routeShortName,
      routeId: selectedVehicle.routeId,
    });
  }

  useEffect(() => {
    function onSelectRoute(e: Event) {
      const id = (e as CustomEvent).detail as string;
      setSelectedRouteIds(new Set([id]));
      setSearch("");
    }
    function onSelectStopFromSearch(e: Event) {
      const id = (e as CustomEvent).detail as string;
      setSelected({ kind: "stop", id });
      setSearch("");
    }
    window.addEventListener("select-route", onSelectRoute);
    window.addEventListener("select-stop", onSelectStopFromSearch);
    return () => {
      window.removeEventListener("select-route", onSelectRoute);
      window.removeEventListener("select-stop", onSelectStopFromSearch);
    };
  }, []);

  const favoriteCount = favorites.length;

  return (
    <div className="fixed inset-0 bg-[#0a0e14] overflow-hidden">
      <MapView
        vehicles={filteredVehicles}
        selectedRouteIds={selectedRouteIds}
        selected={selected}
        onSelectVehicle={handleSelectVehicle}
        onSelectStop={handleSelectStop}
        followUser={followUser}
        userLocation={userLocation}
      />

      <TopBar
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        onLocate={handleLocate}
        feedStatus={status}
        favoriteCount={favoriteCount}
      />

      {selectedRouteIds.size > 0 && (
        <div className="absolute top-[112px] left-3 z-[500] pointer-events-auto flex items-center gap-2">
          <span className="px-3 h-9 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xl rounded-full border border-white/10 text-sm text-slate-200 shadow-lg">
            Маршрут
            {Array.from(selectedRouteIds).map((id) => {
              const r = getRoute(id);
              return r ? (
                <span key={id} className="font-bold" style={{ color: r.color }}>
                  {r.shortName}
                </span>
              ) : (
                <span key={id} className="font-bold text-blue-300">
                  {vehicles.find((v) => v.routeId === id)?.routeShortName ?? "—"}
                </span>
              );
            })}
          </span>
          <button
            onClick={() => setSelectedRouteIds(new Set())}
            className="w-9 h-9 flex items-center justify-center bg-slate-900/80 backdrop-blur-xl rounded-full border border-white/10 text-slate-300 hover:text-white shadow-lg transition-colors"
            aria-label="Скинути фільтр маршруту"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {selectedVehicle && (
        <VehicleSheet
          vehicle={selectedVehicle}
          isFavorite={isFavorite(selectedVehicle.id)}
          onToggleFavorite={handleToggleFavorite}
          onShowRoute={handleShowRoute}
          onClose={() => setSelected(null)}
        />
      )}

      {selectedStop && (
        <StopSheet
          stop={selectedStop}
          arrivals={arrivals}
          loading={arrivalsLoading}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
