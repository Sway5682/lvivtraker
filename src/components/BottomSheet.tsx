import { useState, useEffect } from "react";
import {
  X, Star, TramFront, Bus, Zap, Navigation, Gauge, Hash, Accessibility, Clock, ChevronRight
} from "lucide-react";
import type { Vehicle, StopInfo, StopArrival, VehicleType } from "../types";
import { TYPE_LABELS, getRoute } from "../data/lviv";

interface VehicleSheetProps {
  vehicle: Vehicle;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShowRoute: () => void;
  onClose: () => void;
}

function TypeIcon({ type, className, size = 16 }: { type: VehicleType; className?: string; size?: number }) {
  if (type === "tram") return <TramFront className={className} size={size} />;
  if (type === "trolleybus") return <Zap className={className} size={size} />;
  return <Bus className={className} size={size} />;
}

function typeAccent(type: VehicleType): string {
  if (type === "tram") return "from-rose-500/20 to-rose-500/5 text-rose-300 border-rose-500/30";
  if (type === "trolleybus") return "from-blue-500/20 to-blue-500/5 text-blue-300 border-blue-500/30";
  return "from-orange-500/20 to-orange-500/5 text-orange-300 border-orange-500/30";
}

export function VehicleSheet({ vehicle, isFavorite, onToggleFavorite, onShowRoute, onClose }: VehicleSheetProps) {
  const route = getRoute(vehicle.routeId);
  const [starred, setStarred] = useState(isFavorite);

  useEffect(() => setStarred(isFavorite), [isFavorite]);

  function handleStar() {
    setStarred((s) => !s);
    onToggleFavorite();
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[600] pointer-events-auto pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-lg bg-slate-900/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/10 shadow-2xl overflow-hidden animate-sheet-up">
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-5 pt-2">
          <div className="flex items-start gap-3 mb-4">
            <div
              className="flex items-center justify-center w-14 h-14 rounded-2xl text-white font-bold text-lg shrink-0 shadow-lg"
              style={{ background: vehicle.color }}
            >
              {vehicle.routeShortName}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-base">{TYPE_LABELS[vehicle.type]} №{vehicle.routeShortName}</span>
              </div>
              <p className="text-slate-400 text-sm truncate">
                <Navigation size={11} className="inline mr-1 -mt-0.5" style={{ transform: `rotate(${vehicle.bearing}deg)` }} />
                {vehicle.destination || "—"}
              </p>
              {route && (
                <p className="text-slate-500 text-xs truncate mt-0.5">
                  {route.endpoints[0]} ↔ {route.endpoints[1]}
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <InfoCard icon={<Gauge size={16} />} label="Швидкість" value={vehicle.speed != null ? `${Math.round(vehicle.speed)} км/год` : "—"} />
            <InfoCard icon={<Hash size={16} />} label="Бортовий №" value={vehicle.boardNumber} />
            <InfoCard icon={<Navigation size={16} />} label="Напрямок" value={`${Math.round(vehicle.bearing)}°`} />
            <InfoCard
              icon={<Accessibility size={16} />}
              label="Низькопідлоговий"
              value={vehicle.lowFloor ? "Так" : "Ні"}
              highlight={vehicle.lowFloor}
            />
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={handleStar}
              className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl font-medium text-sm border transition-all active:scale-95 ${
                starred
                  ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
              }`}
            >
              <Star size={17} fill={starred ? "currentColor" : "none"} />
              {starred ? "В обраних" : "В обране"}
            </button>
            <button
              onClick={onShowRoute}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl font-medium text-sm bg-blue-500 text-white hover:bg-blue-400 border border-blue-400 transition-all active:scale-95"
            >
              Показати маршрут
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-gradient-to-br ${highlight ? "from-emerald-500/15 to-emerald-500/5 border-emerald-500/20" : "from-white/5 to-transparent border-white/10"}`}>
      <span className={highlight ? "text-emerald-300" : "text-slate-400"}>{icon}</span>
      <div className="min-w-0">
        <div className="text-slate-500 text-[10px] uppercase tracking-wide">{label}</div>
        <div className={`text-sm font-medium truncate ${highlight ? "text-emerald-200" : "text-white"}`}>{value}</div>
      </div>
    </div>
  );
}

interface StopSheetProps {
  stop: StopInfo;
  arrivals: StopArrival[];
  loading: boolean;
  onClose: () => void;
}

export function StopSheet({ stop, arrivals, loading, onClose }: StopSheetProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-[600] pointer-events-auto pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-lg bg-slate-900/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/10 shadow-2xl overflow-hidden animate-sheet-up">
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-5 pt-2">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-700/60 text-slate-200 shrink-0 border border-white/10">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-base truncate">{stop.name}</h3>
              <p className="text-slate-500 text-xs">Зупинка №{stop.id}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {stop.routes.slice(0, 6).map((r) => (
                  <span key={r} className="text-[11px] px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300 font-medium">
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-2.5">
            <Clock size={14} className="text-slate-400" />
            <h4 className="text-slate-300 text-sm font-medium">Найближчий транспорт</h4>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : arrivals.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">Транспорт не знайдено поблизу</p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {arrivals.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5"
                >
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg text-white text-xs font-bold shrink-0 bg-gradient-to-br ${typeAccent(a.type)}`}>
                    {a.routeShortName}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{a.destination}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <TypeIcon type={a.type} size={11} />
                      {TYPE_LABELS[a.type]}
                      {a.lowFloor && <Accessibility size={11} className="text-emerald-400" />}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-white font-bold text-lg leading-none">
                      {a.arrivalMinutes != null ? a.arrivalMinutes : "—"}
                    </div>
                    <div className="text-slate-500 text-[10px]">хв</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
