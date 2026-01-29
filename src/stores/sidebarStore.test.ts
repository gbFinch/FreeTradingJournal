import { beforeEach, describe, expect, it, vi } from "vitest";

// Must mock localStorage before importing the store
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("useSidebarStore", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorageMock.clear();

    // Reset module cache to get fresh store state
    vi.resetModules();
  });

  describe("initial state", () => {
    it("defaults to expanded when no preference stored", async () => {
      const { useSidebarStore } = await import("./sidebarStore");

      expect(useSidebarStore.getState().isCollapsed).toBe(false);
    });

    it("uses stored collapsed state from localStorage", async () => {
      localStorageMock.getItem.mockReturnValue("true");

      const { useSidebarStore } = await import("./sidebarStore");

      expect(useSidebarStore.getState().isCollapsed).toBe(true);
    });

    it("remains expanded when localStorage has false", async () => {
      localStorageMock.getItem.mockReturnValue("false");

      const { useSidebarStore } = await import("./sidebarStore");

      expect(useSidebarStore.getState().isCollapsed).toBe(false);
    });
  });

  describe("toggleCollapsed", () => {
    it("toggles from expanded to collapsed", async () => {
      localStorageMock.getItem.mockReturnValue(null as unknown as string);
      const { useSidebarStore } = await import("./sidebarStore");
      expect(useSidebarStore.getState().isCollapsed).toBe(false);

      useSidebarStore.getState().toggleCollapsed();

      expect(useSidebarStore.getState().isCollapsed).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "sidebarCollapsed",
        "true"
      );
    });

    it("toggles from collapsed to expanded", async () => {
      localStorageMock.getItem.mockReturnValue("true");
      const { useSidebarStore } = await import("./sidebarStore");
      expect(useSidebarStore.getState().isCollapsed).toBe(true);

      useSidebarStore.getState().toggleCollapsed();

      expect(useSidebarStore.getState().isCollapsed).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "sidebarCollapsed",
        "false"
      );
    });

    it("persists state across multiple toggles", async () => {
      localStorageMock.getItem.mockReturnValue(null as unknown as string);
      const { useSidebarStore } = await import("./sidebarStore");

      useSidebarStore.getState().toggleCollapsed();
      expect(useSidebarStore.getState().isCollapsed).toBe(true);

      useSidebarStore.getState().toggleCollapsed();
      expect(useSidebarStore.getState().isCollapsed).toBe(false);

      useSidebarStore.getState().toggleCollapsed();
      expect(useSidebarStore.getState().isCollapsed).toBe(true);

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(3);
    });
  });
});
