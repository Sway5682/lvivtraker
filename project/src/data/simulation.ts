import type { Vehicle, RouteInfo, StopArrival } from "../types";
import { ROUTES, STOPS } from "../data/lviv";

function bearingBetween(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const dLng = toRad(b[1] - a[1]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface SimVehicle extends Vehicle {
  progress: number;
  speedFactor: number;
}

const BOARDS: Record<string, string[]> = {
  "1": ["1001", "1003"],
  "2": ["2002", "2005"],
  "8": ["8001", "8004"],
  "32": ["3201", "3204"],
  "18": ["1801", "1803"],
  "20": ["2001", "2005"],
  "22": ["2201", "2203"],
  "30": ["3002", "3005"],
  "46": ["4601", "4602"],
  "47А": ["4701", "4702"],
};

let simVehicles: SimVehicle[] | null = null;

function makeVehicles(): SimVehicle[] {
  const result: SimVehicle[] = [];
  for (const route of ROUTES) {
    const boards = BOARDS[route.shortName] || ["0001"];
    boards.forEach((board, idx) => {
      const direction: 0 | 1 = idx % 2 === 0 ? 0 : 1;
      result.push({
        id: `${route.id}-${idx}`,
        routeId: route.id,
        routeShortName: route.shortName,
        type: route.type,
        color: route.color,
        lat: route.shape[0][0],
        lng: route.shape[0][1],
        bearing: 0,
        speed: 30 + Math.random() * 20,
        direction,
        lowFloor: Math.random() > 0.5,
        boardNumber: board,
        destination: direction === 0 ? route.endpoints[1] : route.endpoints[0],
        progress: Math.random() * 0.8,
        speedFactor: 0.012 + Math.random() * 0.016,
      });
    });
  }
  return result;
}

export function simulateTick(): Vehicle[] {
  if (!simVehicles) simVehicles = makeVehicles();

  for (const v of simVehicles) {
    v.progress += v.speedFactor;
    if (v.progress >= 1) {
      v.progress = 0;
      v.direction = v.direction === 0 ? 1 : 0;
      const route = ROUTES.find((r) => r.id === v.routeId) as RouteInfo;
      v.destination =
        v.direction === 0 ? route.endpoints[1] : route.endpoints[0];
    }

    const route = ROUTES.find((r) => r.id === v.routeId) as RouteInfo;
    const shape = route.shape;
    const totalSegs = shape.length - 1;
    const segFloat = v.progress * totalSegs;
    const segIdx = Math.min(Math.floor(segFloat), totalSegs - 1);
    const segT = segFloat - segIdx;

    const a = shape[segIdx];
    const b = shape[segIdx + 1];
    v.lat = lerp(a[0], b[0], segT);
    v.lng = lerp(a[1], b[1], segT);
    v.bearing = bearingBetween(a, b);
    v.speed = 20 + Math.random() * 25;
  }

  return simVehicles.map((v) => ({ ...v }));
}

export function getSimStopArrivals(stopId: string): StopArrival[] {
  const stop = STOPS.find((s) => s.id === stopId);
  if (!stop) return [];

  const activeVeh = simVehicles || makeVehicles();
  simVehicles = activeVeh;

  return stop.routes
    .map((routeName: string): StopArrival | null => {
      const route = ROUTES.find((r) => r.shortName === routeName);
      if (!route) return null;
      const veh = activeVeh.find((v) => v.routeShortName === routeName);
      if (!veh) return null;
      const baseMin = Math.max(1, Math.round(Math.random() * 15));
      return {
        routeShortName: routeName,
        type: route.type,
        destination: veh.destination,
        arrivalMinutes: baseMin,
        lowFloor: veh.lowFloor,
      };
    })
    .filter((a: StopArrival | null): a is StopArrival => a !== null);
}
