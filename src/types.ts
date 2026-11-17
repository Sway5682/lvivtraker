export type VehicleType = "tram" | "trolleybus" | "bus";

export interface RouteInfo {
  id: string;
  shortName: string;
  longName: string;
  type: VehicleType;
  color: string;
  endpoints: [string, string];
  shape: [number, number][];
}

export interface StopInfo {
  id: string;
  name: string;
  engName?: string;
  location: [number, number];
  routes: string[];
}

export interface Vehicle {
  id: string;
  routeId: string;
  routeShortName: string;
  type: VehicleType;
  color: string;
  lat: number;
  lng: number;
  bearing: number;
  speed: number | null;
  direction: 0 | 1;
  lowFloor: boolean;
  boardNumber: string;
  destination: string;
  nextStop?: string;
  arrivalMinutes?: number | null;
}

export interface StopArrival {
  routeShortName: string;
  type: VehicleType;
  destination: string;
  arrivalMinutes: number | null;
  lowFloor: boolean;
}

export type FilterType = "all" | "tram" | "trolleybus" | "bus" | "favorites";

export interface Selection {
  kind: "vehicle" | "stop";
  id: string;
}
