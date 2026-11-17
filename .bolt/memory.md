# Project memory

## Product intent & audience

- Public transport (trams & trolleybuses) tracking app for Lviv, Ukraine
- Users can view vehicles on a map, select them, add to favorites, filter by route, and see arrival times at stops
- Dual-mode: live (real city API, may return partial data) and demo (full local dataset, vehicles visible immediately)

## Brand personality & voice

- User communicates in Russian; UI labels and stop names in Ukrainian
- Concise, technical changelog-style communication

## Visual design & UX direction

- Map-centric UI showing route lines and moving vehicles
- Each route has a distinct color (e.g. tram 32 — blue line through SW city)
- Route lines drawn geographically (32: SW via Hereta–Rail station; 18: SE via Rynok Sq–Lychakiv; 20: NW via Soborna Sq–Ryasne)
- Stops display arrival boards filtered by routes serving them
- Route filtering and favorites are first-class interactions

## Decisions, constraints & rationale

- Routes/vehicles sourced from a local dataset; real API may only return a subset of lines
- New routes added with ~2 vehicles each, consistent with existing routes
- Adding a route requires: route data, vehicles in simulation, new stops, and updating route lists on shared stops (e.g. Rynok Sq, Soborna Sq, Rail station) so arrival boards include them
- Type-checking run after changes; no type errors tolerated

## Open questions & assumptions

- Exact set of all pre-existing routes unknown; 32/18/20 were missing and now added
- Real API coverage for newly added routes unconfirmed; assumed live mode shows them only if API returns them
- Vehicle count per route (2) assumed sufficient for demo visibility