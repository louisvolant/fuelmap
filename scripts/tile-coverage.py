"""Mark the brand snapshot's tiles as covered by Geofabrik region polygons.

Building the snapshot from `.osm.pbf` extracts (see
`extract-osm-fuel-nodes.py`) leaves `brand-snapshot/tiles-done.json` behind the
crawl: this script fills it so a later `--resume` crawl does not refetch areas
the extracts already cover.

A tile is marked done only when its four corners **and** centre fall inside the
**union** of the region polygons. Partially covered edge tiles (coastlines,
region borders) therefore stay pending, and a later Overpass crawl still fills
whatever the extract did not contain.

    python3 scripts/tile-coverage.py brand-snapshot/tiles-done.json \
      brand-snapshot/tiles-done.json /tmp/osm/*.poly
"""

import json
import sys

WEST, SOUTH, STEP = -5.0, 41.0, 0.5
COLS, ROWS = 30, 21


def master_tiles():
    tiles = []
    for row in range(ROWS):
        for col in range(COLS):
            w = WEST + col * STEP
            s = SOUTH + row * STEP
            tiles.append((w, s, w + STEP, s + STEP))
    return tiles


def read_poly(path):
    """Rings of a `.poly` file, as `(lon, lat)` lists (holes are plain rings)."""
    rings, current = [], None
    with open(path, encoding="utf-8", errors="replace") as handle:
        for raw in handle:
            line = raw.strip()
            if not line:
                continue
            if line.lower() == "end":
                if current:
                    rings.append(current)
                current = None
                continue
            if line.startswith("!") or (current is None and line[0].isdigit()):
                if current:
                    rings.append(current)
                current = []
                continue
            if current is None:
                continue
            parts = line.split()
            if len(parts) >= 2:
                current.append((float(parts[0]), float(parts[1])))
    if current:
        rings.append(current)
    return rings


def inside(rings, lon, lat):
    """Even-odd point-in-polygon across every ring (holes flip the parity)."""
    crossings = 0
    for ring in rings:
        for index, (x1, y1) in enumerate(ring):
            x2, y2 = ring[(index + 1) % len(ring)]
            if (y1 > lat) != (y2 > lat):
                x = x1 + (lat - y1) * (x2 - x1) / (y2 - y1)
                if x > lon:
                    crossings += 1
    return crossings % 2 == 1


def main():
    done_path, out_path, *polys = sys.argv[1:]
    tiles = master_tiles()
    done = set(json.load(open(done_path)))
    added = []

    shells = []
    for path in polys:
        rings = read_poly(path)
        if not rings:
            print(f"warning: no ring in {path}", file=sys.stderr)
            continue
        shells.append(rings)

    def covered(lon, lat):
        # The **union** of the regions: a tile straddling a region border is
        # covered when each of its probes falls inside one region or another.
        return any(inside(rings, lon, lat) for rings in shells)

    for index, (w, s, e, n) in enumerate(tiles):
        if index in done:
            continue
        probes = [(w, s), (e, s), (e, n), (w, n), ((w + e) / 2, (s + n) / 2)]
        if all(covered(lon, lat) for lon, lat in probes):
            done.add(index)
            added.append(index)

    json.dump(sorted(done), open(out_path, "w"))
    print(f"tiles done: {len(done)} (+{len(added)} from {len(polys)} polygons)")


if __name__ == "__main__":
    main()
