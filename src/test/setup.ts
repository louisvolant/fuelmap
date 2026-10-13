import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

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
    remove() {}
    setStyle() {
      return this;
    }
    addControl() {
      return this;
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

  const maplibre = { Map, NavigationControl, ScaleControl, Marker, Popup };
  return { ...maplibre, default: maplibre };
});
