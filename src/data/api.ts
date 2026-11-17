import type { Vehicle, StopArrival, RouteInfo } from "../types";
import { ROUTES, getRoute, getRouteByName, STOPS } from "../data/lviv";
import { simulateTick, getSimStopArrivals } from "./simulation";

const API_BASE = "https://api.lad.lviv.ua";
const FETCH_TIMEOUT = 4000;

let liveMode: boolean | null = null;

export function isLiveMode(): boolean {
  return liveMode === true;
}

function mapType(t: string): Vehicle["type"] {
  if (t === "tram") return "tram";
  if (t === "trolleybus") return "trolleybus";
  return "bus";
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRoutes(): Promise<RouteInfo[]> {
  if (liveMode === false) return ROUTES;
  try {
    const res = await fetchWithTimeout(`${API_BASE}/routes.json`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const mapped: RouteInfo[] = (Array.isArray(data) ? data : []).map(
      (r: Record<string, unknown>, i: number): RouteInfo => {
        const typeStr = String(r.type ?? "");
        const color = String(r.color ?? "#ff8c42");
        return {
          id: String(r.external_id ?? r.id ?? `route-${i}`),
          shortName: String(r.short_name ?? ""),
          longName: String(r.long_name ?? ""),
          type: mapType(typeStr),
          color,
          endpoints: ["—", "—"],
          shape: [],
        };
      }
    );
    if (mapped.length > 0) {
      liveMode = true;
      return mapped;
    }
    throw new Error("empty routes");
  } catch {
    liveMode = false;
    return ROUTES;
  }
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  if (liveMode === false) return simulateTick();
  try {
    const res = await fetchWithTimeout(`${API_BASE}/transport?latitude=49.8397&longitude=24.0297`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const arr = Array.isArray(data) ? data : data.vehicles ?? [];
    if (arr.length === 0) throw new Error("no vehicles");
    const mapped: Vehicle[] = arr.map(
      (v: Record<string, unknown>, i: number): Vehicle => {
        const loc = v.location as [number, number] | undefined;
        const typeStr = String(v.vehicle_type ?? v.type ?? "bus");
        const type = mapType(typeStr);
        const routeName = String(v.route ?? "");
        const route = getRouteByName(routeName);
        const color = route?.color ?? String(v.color ?? "#ff8c42");
        return {
          id: String(v.id ?? `veh-${i}`),
          routeId: route?.id ?? String(v.routeId ?? ""),
          routeShortName: routeName,
          type,
          color,
          lat: loc?.[0] ?? 49.8397,
          lng: loc?.[1] ?? 24.0297,
          bearing: Number(v.bearing ?? 0),
          speed: v.speed === null ? null : Number(v.speed ?? 0),
          direction: (Number(v.direction ?? 0) === 1 ? 1 : 0) as 0 | 1,
          lowFloor: Boolean(v.lowfloor ?? false),
          boardNumber: String(v.id ?? "—"),
          destination: String(v.destination ?? ""),
        };
      }
    );
    liveMode = true;
    return mapped;
  } catch {
    liveMode = false;
    return simulateTick();
  }
}

export async function fetchStopArrivals(stopId: string): Promise<StopArrival[]> {
  if (liveMode === false) return getSimStopArrivals(stopId);
  try {
    const res = await fetchWithTimeout(`${API_BASE}/stops/${stopId}/timetable`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const timetable = data.timetable ?? [];
    const mapped: StopArrival[] = timetable.map(
      (t: Record<string, unknown>): StopArrival => ({
        routeShortName: String(t.route ?? ""),
        type: mapType(String(t.vehicle_type ?? "bus")),
        destination: String(t.direction ?? ""),
        arrivalMinutes: typeof t.arrival_minutes === "number" ? t.arrival_minutes : null,
        lowFloor: Boolean(t.lowfloor ?? false),
      })
    );
    if (mapped.length > 0) {
      liveMode = true;
      return mapped;
    }
    throw new Error("no arrivals");
  } catch {
    liveMode = false;
    return getSimStopArrivals(stopId);
  }
}

export function getRouteShape(routeId: string): [number, number][] | null {
  const route = getRoute(routeId);
  return route?.shape ?? null;
}

export { ROUTES, STOPS };
