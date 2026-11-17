import type { Vehicle, StopArrival, VehicleType, RouteInfo } from "../types";
import { fetchLiveVehicles, fetchLiveTimetable } from "./live";

function mapType(t: string): VehicleType {
  if (t === "tram") return "tram";
  if (t === "trolleybus") return "trolleybus";
  return "bus";
}

function mapVehicle(v: Record<string, unknown>, i: number): Vehicle {
  const loc = v.location as [number, number] | undefined;
  const type = mapType(String(v.vehicle_type ?? "bus"));
  const color = String(v.color ?? "#ff8c42");
  return {
    id: String(v.id ?? `veh-${i}`),
    routeId: String(v.routeId ?? ""),
    routeShortName: String(v.route ?? ""),
    type,
    color,
    lat: loc?.[0] ?? 0,
    lng: loc?.[1] ?? 0,
    bearing: Number(v.bearing ?? 0),
    speed: v.speed === null ? null : Number(v.speed ?? 0),
    direction: (Number(v.direction ?? 0) === 1 ? 1 : 0) as 0 | 1,
    lowFloor: Boolean(v.lowfloor ?? false),
    boardNumber: String(v.id ?? "—"),
    destination: "",
  };
}

export async function fetchVehicles(): Promise<{ vehicles: Vehicle[]; fetchedAt: number | null }> {
  const { data, fetchedAt } = await fetchLiveVehicles();
  if (!data) return { vehicles: [], fetchedAt: null };
  const vehicles = data
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map(mapVehicle)
    .filter((v) => v.lat !== 0 && v.lng !== 0);
  return { vehicles, fetchedAt };
}

interface TimetableRow {
  route_id?: unknown;
  lowfloor?: unknown;
  end_stop?: unknown;
  end_stop_name?: unknown;
  arrival_time?: unknown;
  time_left?: unknown;
  route?: unknown;
  vehicle_type?: unknown;
}

export async function fetchStopArrivals(stopId: string): Promise<StopArrival[]> {
  const { data } = await fetchLiveTimetable(stopId);
  if (!data) return [];
  return (data as TimetableRow[])
    .map((t): StopArrival => ({
      routeShortName: String(t.route ?? ""),
      type: mapType(String(t.vehicle_type ?? "bus")),
      destination: String(t.end_stop_name ?? t.end_stop ?? ""),
      arrivalMinutes: parseTimeLeft(String(t.time_left ?? "")),
      lowFloor: Boolean(t.lowfloor ?? false),
    }));
}

function parseTimeLeft(s: string): number | null {
  const min = /^(\d+)\s*хв$/.exec(s.trim());
  if (min) return Number(min[1]);
  return null;
}

export type { RouteInfo };
