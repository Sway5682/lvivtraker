import { useEffect, useState } from "react";

export type FeedStatus = "connecting" | "live" | "offline";

interface FetchResult<T> {
  data: T | null;
  fetchedAt: number | null;
}

const FETCH_TIMEOUT = 8000;

export function useEdgeFunction(): FeedStatus {
  const [status, setStatus] = useState<FeedStatus>("connecting");

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function probe() {
      let ok = false;
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lviv-transport/vehicles`, {
          method: "HEAD",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        });
        clearTimeout(t);
        ok = res.ok;
      } catch {
        ok = false;
      }
      if (!cancelled) {
        setStatus(ok ? "live" : "offline");
        timer = window.setTimeout(probe, 30000);
      }
    }

    probe();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return status;
}

export async function fetchLiveVehicles(): Promise<FetchResult<unknown[]>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lviv-transport/vehicles`, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
    return { data: vehicles, fetchedAt: data.fetchedAt ? Date.parse(data.fetchedAt) : null };
  } catch {
    return { data: null, fetchedAt: null };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLiveTimetable(stopId: string): Promise<FetchResult<unknown[]>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lviv-transport/stop/${encodeURIComponent(stopId)}`, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const timetable = Array.isArray(data.timetable) ? data.timetable : [];
    return { data: timetable, fetchedAt: data.fetchedAt ? Date.parse(data.fetchedAt) : null };
  } catch {
    return { data: null, fetchedAt: null };
  } finally {
    clearTimeout(timer);
  }
}
