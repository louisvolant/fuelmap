// Builds the precomputed French brand snapshot served at
// `GET /api/fr/brands/snapshot` (see `worker/index.ts`).
//
// Why offline: joining ~9 800 DGCCRF stations against OpenStreetMap needs
// hundreds of Overpass queries. Browsers must never pay that cost — this script
// runs it once (locally or in CI), writes `snapshot.json` + `manifest.json`,
// and the operator uploads both to R2:
//
//   node scripts/publish-brand-snapshot.mjs --bbox 2.2,48.6,2.7,49.0 --out ./brand-snapshot
//   npx wrangler r2 object put fuelmap-bucket/brands-resolutions/v1/snapshot.json --file ./brand-snapshot/snapshot.json --content-type "application/json; charset=utf-8"
//   npx wrangler r2 object put fuelmap-bucket/brands-resolutions/v1/manifest.json --file ./brand-snapshot/manifest.json --content-type "application/json; charset=utf-8"
//
// When Overpass saturates mid-crawl, progress is checkpointed per tile in
// `--out` (`stations.json`, `nodes.jsonl`, `tiles-done.json`): rerun the exact
// same command with `--resume` to fetch only the missing tiles.
//
// Safety rules (same as the Worker): an Overpass failure is never cached as an
// empty result — without mirror data the script exits non-zero and writes
// nothing. Use `--allow-empty` only to deliberately publish an empty area.
//
// Run with: npm run brands:snapshot -- [options]
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DGCCRF_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";
const OSM_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const VERSION = "v1";
const MAX_DISTANCE_M = 120;
/** Overlap margin so stations near a tile border still find their OSM node. */
const TILE_MARGIN = 0.02;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Minimal argv parser: `--key value` and boolean `--flag`. */
export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

export function parseBbox(value, fallback) {
  if (!value) return fallback;
  const parts = String(value)
    .split(",")
    .map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(`invalid --bbox (want "w,s,e,n"): ${value}`);
  }
  return parts;
}

/** Split a bbox into `step`° tiles, each grown by the overlap margin. */
export function splitBbox(bbox, step) {
  const [west, south, east, north] = bbox;
  const tiles = [];
  for (let tileSouth = south; tileSouth < north; tileSouth += step) {
    for (let tileWest = west; tileWest < east; tileWest += step) {
      tiles.push([
        Math.max(tileWest - TILE_MARGIN, -180),
        Math.max(tileSouth - TILE_MARGIN, -90),
        Math.min(tileWest + step + TILE_MARGIN, 180),
        Math.min(tileSouth + step + TILE_MARGIN, 90),
      ]);
    }
  }
  return tiles;
}

/** Haversine distance, in meters. */
export function distanceMeters(aLonLat, bLonLat) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const [lon1, lat1] = aLonLat;
  const [lon2, lat2] = bLonLat;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/**
 * Greedy unique-assignment join: each official station gets its nearest OSM
 * node within range, each node brands at most one station. Mirrors
 * `enrichStationsWithBrands` (`src/lib/osmBrands.ts`).
 */
export function joinStations(stations, nodes, maxDistanceM = MAX_DISTANCE_M) {
  const branded = nodes.filter((node) => Boolean(node.brand));
  const byId = new Map(stations.map((s) => [s.id, s]));
  const pairs = [];
  for (const station of stations) {
    for (let i = 0; i < branded.length; i += 1) {
      const node = branded[i];
      const distance = distanceMeters(
        [station.lon, station.lat],
        [node.lon, node.lat],
      );
      if (distance <= maxDistanceM) pairs.push({ station, index: i, distance });
    }
  }
  pairs.sort((a, b) => a.distance - b.distance);
  const used = new Set();
  const done = new Set();
  const matches = [];
  for (const { station, index, distance } of pairs) {
    if (used.has(index) || done.has(station.id)) continue;
    used.add(index);
    done.add(station.id);
    matches.push({
      station: byId.get(station.id),
      brand: branded[index].brand,
      osmKey: branded[index].key,
      distanceM: Math.round(distance * 10) / 10,
    });
  }
  return matches;
}

export function toSnapshotPayload(matches, now = Date.now()) {
  const brands = {};
  for (const match of matches) {
    brands[match.station.id] = {
      brand: match.brand,
      osmKey: match.osmKey,
      lat: match.station.lat,
      lon: match.station.lon,
      distanceM: match.distanceM,
      resolvedAt: now,
    };
  }
  return { version: VERSION, updatedAt: now, brands };
}

export function toManifestPayload(matches, now = Date.now()) {
  return {
    version: VERSION,
    resolverVersion: VERSION,
    updatedAt: now,
    count: matches.length,
  };
}

/** Fetch DGCCRF station coordinates (paginated, `select=id,geom` only). */
export async function fetchDgccrf(fetchImpl = fetch, maxRecords = Infinity) {
  const stations = [];
  let offset = 0;
  for (;;) {
    const url = new URL(DGCCRF_URL);
    url.searchParams.set("limit", "100");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("order_by", "id");
    url.searchParams.set("select", "id,geom");
    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new Error(`DGCCRF request failed with status ${response.status}`);
    }
    const payload = await response.json();
    const records = payload.results ?? [];
    for (const record of records) {
      const geom = record.geom;
      if (
        typeof record.id !== "number" ||
        !geom ||
        !Number.isFinite(geom.lat) ||
        !Number.isFinite(geom.lon)
      ) {
        continue;
      }
      stations.push({
        id: `FR:${record.id}`,
        lat: geom.lat,
        lon: geom.lon,
      });
      if (stations.length >= maxRecords) return stations;
    }
    if (records.length < 100) return stations;
    offset += records.length;
  }
}

/** Trustworthy Overpass answer? Mirrors `isTrustworthyOverpassAnswer`. */
function isTrustworthy(payload) {
  if (!Array.isArray(payload?.elements)) return false;
  if (payload.remark) return false;
  if (payload.elements.length > 0) return true;
  return /^\d{4}-\d{2}-\d{2}T/.test(payload.osm3s?.timestamp_osm_base ?? "");
}

/** Files holding crawl progress so `--resume` only fetches missing tiles. */
export function checkpointPaths(outDir) {
  return {
    stationsFile: resolve(outDir, "stations.json"),
    nodesFile: resolve(outDir, "nodes.jsonl"),
    doneFile: resolve(outDir, "tiles-done.json"),
  };
}

/** Read back a checkpoint, or `null` when none was written. */
export function loadCheckpoint(outDir) {
  const { stationsFile, nodesFile, doneFile } = checkpointPaths(outDir);
  if (!existsSync(stationsFile) || !existsSync(doneFile)) return null;
  const stations = JSON.parse(readFileSync(stationsFile, "utf8"));
  const done = new Set(JSON.parse(readFileSync(doneFile, "utf8")));
  const nodes = existsSync(nodesFile)
    ? readFileSync(nodesFile, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];
  return { stations, done, nodes };
}

export function saveStationsCheckpoint(outDir, stations) {
  writeFileSync(checkpointPaths(outDir).stationsFile, JSON.stringify(stations));
}

/** Append one tile's nodes immediately: an interruption keeps them. */
export function appendTileNodes(outDir, nodes) {
  if (nodes.length === 0) return;
  appendFileSync(
    checkpointPaths(outDir).nodesFile,
    nodes.map((node) => JSON.stringify(node)).join("\n") + "\n",
  );
}

export function saveDoneCheckpoint(outDir, done) {
  writeFileSync(checkpointPaths(outDir).doneFile, JSON.stringify([...done]));
}

/** Query Overpass mirrors in order, with exponential backoff between rounds. */
export async function queryOverpass(
  tile,
  { fetchImpl = fetch, rounds = 3 } = {},
) {
  const [west, south, east, north] = tile;
  const query = `[out:json][timeout:25];nwr["amenity"="fuel"](${south},${west},${north},${east});out center tags;`;
  for (let round = 0; round < rounds; round += 1) {
    for (const mirror of OSM_MIRRORS) {
      try {
        const response = await fetchImpl(mirror, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            accept: "application/json",
            "user-agent": "FuelMap/1.0 (+https://github.com/louisvolant/fuelmap)",
          },
          body: new URLSearchParams({ data: query }).toString(),
        });
        if (!response.ok) continue;
        const payload = await response.json();
        if (isTrustworthy(payload)) {
          return (payload.elements ?? []).flatMap((element) => {
            const lat = element.lat ?? element.center?.lat;
            const lon = element.lon ?? element.center?.lon;
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
            const tags = element.tags ?? {};
            return [
              {
                key: `${element.type}/${element.id}`,
                lat,
                lon,
                brand: tags.brand ?? tags.operator ?? tags.name ?? null,
              },
            ];
          });
        }
      } catch {
        // Try the next mirror.
      }
    }
    await sleep(2 ** round * 1000);
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bbox = parseBbox(args.bbox, [-5, 41, 10, 51.5]);
  const tileStep = Number(args.tile ?? 0.5);
  const outDir = resolve(process.cwd(), String(args.out ?? "./brand-snapshot"));
  const maxRecords = args["max-records"] ? Number(args["max-records"]) : Infinity;
  const resume = Boolean(args.resume);
  mkdirSync(outDir, { recursive: true });

  // Checkpoint: stations once, OSM nodes incrementally, completed tile indexes
  // alongside — so a saturated Overpass only costs a `--resume` rerun, never a
  // full recrawl.
  let stations = [];
  let nodes = [];
  let done = new Set();
  const checkpoint = resume ? loadCheckpoint(outDir) : null;
  if (checkpoint) {
    stations = checkpoint.stations;
    nodes = checkpoint.nodes;
    done = checkpoint.done;
    console.log(`resuming: ${stations.length} stations, ${done.size} tiles done`);
  } else {
    if (resume) console.log("no checkpoint found, starting fresh…");
    console.log(`fetching DGCCRF coordinates…`);
    const all = await fetchDgccrf(fetch, maxRecords);
    const [west, south, east, north] = bbox;
    stations = all.filter(
      (s) => s.lon >= west && s.lon <= east && s.lat >= south && s.lat <= north,
    );
    console.log(`…${stations.length} stations in bbox`);
    saveStationsCheckpoint(outDir, stations);
  }

  const tiles = splitBbox(bbox, tileStep);
  const remaining = tiles.filter((_, index) => !done.has(index));
  console.log(`querying ${remaining.length}/${tiles.length} Overpass tiles…`);
  const failedTiles = [];
  let fetched = 0;
  for (const [index, tile] of tiles.entries()) {
    if (done.has(index)) continue;
    const result = await queryOverpass(tile);
    if (result === null) {
      failedTiles.push(index);
      console.warn(`tile ${index + 1}/${tiles.length}: mirrors down`);
    } else {
      appendTileNodes(outDir, result);
      nodes.push(...result);
      done.add(index);
      fetched += 1;
      if (fetched % 25 === 0) {
        saveDoneCheckpoint(outDir, done);
      }
    }
    if ((done.size + failedTiles.length) % 25 === 0) {
      console.log(`…${done.size + failedTiles.length}/${tiles.length} tiles`);
    }
  }
  saveDoneCheckpoint(outDir, done);

  console.log(`…${nodes.length} OSM nodes, ${failedTiles.length} failed tiles`);

  if (failedTiles.length > 0) {
    console.error(
      `refusing to publish: ${failedTiles.length} tile(s) missed Overpass data (a partial snapshot would drop brands)`,
    );
    console.error(`rerun with the same --out plus --resume to fill the gaps:`);
    for (const index of failedTiles) {
      console.error(`  tile ${index + 1}: ${tiles[index].join(",")}`);
    }
    process.exitCode = 1;
    return;
  }

  const matches = joinStations(stations, nodes);
  console.log(`…${matches.length} brand matches`);
  if (matches.length === 0 && !args["allow-empty"]) {
    console.error("refusing to publish an empty snapshot (see --allow-empty)");
    process.exitCode = 1;
    return;
  }

  const now = Date.now();
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, "snapshot.json"),
    JSON.stringify(toSnapshotPayload(matches, now)),
  );
  writeFileSync(
    resolve(outDir, "manifest.json"),
    JSON.stringify(toManifestPayload(matches, now)),
  );
  console.log(`wrote ${outDir}/snapshot.json + manifest.json`);
  console.log("upload with:");
  console.log(
    `  npx wrangler r2 object put fuelmap-bucket/brands-resolutions/v1/snapshot.json --file ${outDir}/snapshot.json --content-type "application/json; charset=utf-8"`,
  );
  console.log(
    `  npx wrangler r2 object put fuelmap-bucket/brands-resolutions/v1/manifest.json --file ${outDir}/manifest.json --content-type "application/json; charset=utf-8"`,
  );
}

const invokedAsScript =
  process.argv[1] === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
