"""Extract OpenStreetMap fuel stations from a Geofabrik `.osm.pbf` extract.

The brand snapshot is normally built by crawling Overpass, but the public
mirrors are down for days at a time. This is the offline alternative: download
a regional extract (https://download.geofabrik.de/europe/france/) and turn its
`amenity=fuel` nodes/ways into the same JSONL shape as the crawl checkpoint, so
`publish-brand-snapshot.mjs` can use them.

    npm install --global osmium   # or: pip install osmium
    curl -O https://download.geofabrik.de/europe/france/ile-de-france-latest.osm.pbf
    python3 scripts/extract-osm-fuel-nodes.py ile-de-france-latest.osm.pbf \
      >> brand-snapshot/nodes.jsonl

Then mark the tiles the extract covers with `scripts/tile-coverage.py` (it only
marks tiles fully inside the region polygons, so a later crawl still fills the
edges) and republish with `--offline --resume`. A truncated download is still
usable: PBF stores nodes before ways, so the fuel nodes survive.
"""

import json
import sys

import osmium

BRAND_KEYS = ("brand", "operator", "name")


def brand_of(tags):
    for key in BRAND_KEYS:
        value = tags.get(key)
        if value:
            return value
    return None


class FuelStations(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.items = []
        self.total = 0
        self.branded = 0

    def _add(self, key, lat, lon, tags):
        self.total += 1
        brand = brand_of(tags)
        if brand:
            self.branded += 1
        self.items.append(
            {"key": key, "lat": round(lat, 7), "lon": round(lon, 7), "brand": brand}
        )

    def node(self, node):
        if node.tags.get("amenity") != "fuel":
            return
        if not node.location.valid():
            return
        self._add(
            f"node/{node.id}", node.location.lat, node.location.lon, node.tags
        )

    def way(self, way):
        if way.tags.get("amenity") != "fuel":
            return
        points = [n.location for n in way.nodes if n.location.valid()]
        if not points:
            return
        lat = sum(p.lat for p in points) / len(points)
        lon = sum(p.lon for p in points) / len(points)
        self._add(f"way/{way.id}", lat, lon, way.tags)


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: extract-fuel-nodes.py <extract.osm.pbf>")
    handler = FuelStations()
    try:
        handler.apply_file(sys.argv[1], locations=True)
    except RuntimeError as error:
        # A truncated download still yields every block before the cut, and PBF
        # extracts are sorted by type: all nodes come first, so a file cut in the
        # ways section keeps the fuel *nodes* intact. Recover instead of losing it.
        print(f"# warning: {error} (using the blocks read so far)", file=sys.stderr)

    for item in handler.items:
        print(json.dumps(item, ensure_ascii=False))
    print(
        f"# {handler.total} fuel stations, {handler.branded} with a brand tag",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
