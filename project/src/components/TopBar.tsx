import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, TramFront, Bus, Zap, Star, Locate } from "lucide-react";
import type { FilterType, VehicleType } from "../types";
import { ROUTES, STOPS, TYPE_LABELS_UK } from "../data/lviv";

interface Props {
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  search: string;
  onSearchChange: (s: string) => void;
  onLocate: () => void;
  liveMode: boolean;
  favoriteCount: number;
}

const FILTERS: { key: FilterType; label: string; icon: typeof TramFront }[] = [
  { key: "all", label: "Усі", icon: Zap },
  { key: "tram", label: TYPE_LABELS_UK.tram, icon: TramFront },
  { key: "trolleybus", label: TYPE_LABELS_UK.trolleybus, icon: Zap },
  { key: "bus", label: TYPE_LABELS_UK.bus, icon: Bus },
  { key: "favorites", label: "Обрані", icon: Star },
];

interface SearchResult {
  type: "route" | "stop";
  id: string;
  label: string;
  sublabel: string;
}

export default function TopBar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  onLocate,
  liveMode,
  favoriteCount,
}: Props) {
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<number | null>(null);

  const results = useMemo<SearchResult[]>(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 1) return [];
    const routeHits: SearchResult[] = ROUTES.filter(
      (r) =>
        r.shortName.toLowerCase().includes(q) ||
        r.longName.toLowerCase().includes(q) ||
        r.endpoints.some((e: string) => e.toLowerCase().includes(q))
    ).map((r) => ({
      type: "route" as const,
      id: r.id,
      label: `Маршрут ${r.shortName}`,
      sublabel: r.longName,
    }));

    const stopHits: SearchResult[] = STOPS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.includes(q) ||
        (s.engName ?? "").toLowerCase().includes(q)
    ).map((s) => ({
      type: "stop" as const,
      id: s.id,
      label: s.name,
      sublabel: `Зупинка · №${s.id}`,
    }));

    return [...routeHits.slice(0, 6), ...stopHits.slice(0, 4)];
  }, [search]);

  const showDropdown = focused && search.trim().length > 0 && results.length > 0;

  function handleResultSelect(r: SearchResult) {
    onSearchChange(r.label);
    setFocused(false);
    if (r.type === "route") {
      window.dispatchEvent(
        new CustomEvent("select-route", { detail: r.id })
      );
    } else {
      window.dispatchEvent(new CustomEvent("select-stop", { detail: r.id }));
    }
  }

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  return (
    <div className="absolute top-0 left-0 right-0 z-[500] pt-[env(safe-area-inset-top)] pointer-events-none">
      <div className="px-3 pt-3 space-y-2.5">
        <div className="flex gap-2 pointer-events-auto">
          <div className="relative flex-1">
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg px-3.5 h-12 transition-all focus-within:border-blue-400/50 focus-within:bg-slate-900/90">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
                onFocus={() => {
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  setFocused(true);
                }}
                onBlur={() => {
                  blurTimer.current = window.setTimeout(() => setFocused(false), 200);
                }}
                placeholder="Маршрут або зупинка…"
                className="bg-transparent text-white text-sm placeholder:text-slate-500 outline-none w-full"
              />
              {search && (
                <button
                  onClick={() => onSearchChange("")}
                  className="text-slate-400 hover:text-white transition-colors shrink-0"
                  aria-label="Очистити"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {showDropdown && (
              <div className="absolute top-full mt-1.5 left-0 right-0 bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                {results.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onMouseDown={() => handleResultSelect(r)}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex flex-col gap-0.5 border-b border-white/5 last:border-0"
                  >
                    <span className="text-white text-sm font-medium">{r.label}</span>
                    <span className="text-slate-400 text-xs truncate">{r.sublabel}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onLocate}
            className="shrink-0 w-12 h-12 flex items-center justify-center bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg text-blue-400 hover:bg-slate-800/80 active:scale-95 transition-all"
            aria-label="Моє місце"
          >
            <Locate size={20} />
          </button>
        </div>

        <div className="flex gap-2 pointer-events-auto overflow-x-auto no-scrollbar pb-1">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const active = filter === f.key;
            const count = f.key === "favorites" ? favoriteCount : undefined;
            return (
              <button
                key={f.key}
                onClick={() => onFilterChange(f.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 h-9 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                  active
                    ? "bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/30"
                    : "bg-slate-900/70 text-slate-300 border-white/10 backdrop-blur-xl hover:bg-slate-800/70"
                }`}
              >
                <Icon size={15} />
                {f.label}
                {count !== undefined && count > 0 && (
                  <span className={`text-xs ${active ? "text-blue-100" : "text-slate-400"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          <div className="shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-medium border backdrop-blur-xl ml-auto">
            <span className={`w-2 h-2 rounded-full ${liveMode ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className={liveMode ? "text-emerald-300" : "text-amber-300"}>
              {liveMode ? "Live" : "Демо"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function matchesFilter(
  type: VehicleType,
  filter: FilterType,
  isFavorite: boolean
): boolean {
  if (filter === "all") return true;
  if (filter === "favorites") return isFavorite;
  if (filter === "tram") return type === "tram";
  if (filter === "trolleybus") return type === "trolleybus";
  if (filter === "bus") return type === "bus";
  return true;
}
