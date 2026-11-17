const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const UPSTREAM = "https://api.lad.lviv.ua";
const FETCH_TIMEOUT = 8000;

// The upstream endpoint only returns vehicles near the given point,
// so we query a grid of points across the city and merge the results.
const CITY_POINTS: Array<[number, number]> = [
  [49.8397, 24.0297],
  [49.856, 24.036],
  [49.861, 23.989],
  [49.812, 23.998],
  [49.823, 23.995],
  [49.842, 24.031],
  [49.818, 24.0415],
  [49.806, 24.012],
];

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchVehiclesAt(lat: number, lng: number): Promise<Record<string, unknown>[]> {
  try {
    const data = await fetchJson(`${UPSTREAM}/transport?latitude=${lat}&longitude=${lng}`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const stopIdx = parts.indexOf("stop");

    if (stopIdx !== -1 && parts[stopIdx + 1]) {
      const stopId = parts[stopIdx + 1];
      const data = await fetchJson(`${UPSTREAM}/stops/${stopId}/timetable`);
      return new Response(
        JSON.stringify({ fetchedAt: new Date().toISOString(), timetable: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await Promise.all(
      CITY_POINTS.map(([lat, lng]) => fetchVehiclesAt(lat, lng))
    );
    const byId = new Map<string, Record<string, unknown>>();
    for (const list of results) {
      for (const v of list) {
        if (v && typeof v === "object" && v.id != null && Array.isArray(v.location)) {
          byId.set(String(v.id), v);
        }
      }
    }
    return new Response(
      JSON.stringify({ fetchedAt: new Date().toISOString(), vehicles: Array.from(byId.values()) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "unknown error" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
