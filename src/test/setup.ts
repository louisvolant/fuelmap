import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
// Initialize i18n once for every test so components render translated copy.
import "@/i18n";

// Unit tests must never hit the network. Return an empty ODS page by default;
// individual tests can override the mock when they need data.
vi.stubGlobal(
  "fetch",
  vi.fn(
    async () =>
      new Response(JSON.stringify({ total_count: 0, results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  ),
);

// jsdom does not implement matchMedia, used by the theme hook.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

// MapLibre is lazy-loaded through this module. Bypass it in tests to avoid the
// `?worker&url` import and keep the mocked `maplibre-gl` module.
vi.mock("@/lib/mapLibreLoader", async () => {
  const maplibre = await import("maplibre-gl");
  return { loadMapLibre: async () => maplibre };
});

// MapLibre GL requires WebGL, which jsdom does not implement. Provide a minimal
// mock so components that embed the map can be rendered in unit tests.
vi.mock("maplibre-gl", () => {
  class Map {
    on() {
      return this;
    }
    off() {
      return this;
    }
    once() {
      return this;
    }
    remove() {}
    setStyle() {
      return this;
    }
    addControl() {
      return this;
    }
    addSource() {
      return this;
    }
    addLayer() {
      return this;
    }
    getSource() {
      return undefined;
    }
    getLayer() {
      return undefined;
    }
    isStyleLoaded() {
      return true;
    }
    getZoom() {
      return 5;
    }
    queryRenderedFeatures() {
      return [];
    }
    easeTo() {
      return this;
    }
    flyTo() {
      return this;
    }
    getBounds() {
      return {
        getWest: () => -180,
        getSouth: () => -85,
        getEast: () => 180,
        getNorth: () => 85,
      };
    }
    getCanvas() {
      return document.createElement("canvas");
    }
  }
  class NavigationControl {}
  class ScaleControl {}
  class Marker {
    setLngLat() {
      return this;
    }
    addTo() {
      return this;
    }
    remove() {
      return this;
    }
    setPopup() {
      return this;
    }
    getElement() {
      return document.createElement("div");
    }
  }
  class Popup {
    setLngLat() {
      return this;
    }
    setHTML() {
      return this;
    }
    setText() {
      return this;
    }
    addTo() {
      return this;
    }
    remove() {
      return this;
    }
  }

  const maplibre = {
    Map,
    NavigationControl,
    ScaleControl,
    Marker,
    Popup,
    setWorkerUrl: () => {},
  };
  return { ...maplibre, default: maplibre };
});
