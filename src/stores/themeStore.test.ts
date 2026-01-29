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

// Mock document.documentElement.classList
const classListMock = {
  toggle: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
};
Object.defineProperty(document.documentElement, "classList", {
  value: classListMock,
  writable: true,
});

describe("useThemeStore", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorageMock.clear();
    classListMock.toggle.mockClear();

    // Reset module cache to get fresh store state
    vi.resetModules();
  });

  describe("initial state", () => {
    it("defaults to light theme when no preference stored", async () => {
      const { useThemeStore } = await import("./themeStore");

      expect(useThemeStore.getState().theme).toBe("light");
    });

    it("uses stored theme from localStorage", async () => {
      localStorageMock.getItem.mockReturnValue("dark");

      const { useThemeStore } = await import("./themeStore");

      expect(useThemeStore.getState().theme).toBe("dark");
    });

    it("applies theme on store creation", async () => {
      localStorageMock.getItem.mockReturnValue("dark");

      await import("./themeStore");

      expect(classListMock.toggle).toHaveBeenCalledWith("dark", true);
    });
  });

  describe("setTheme", () => {
    it("sets theme to dark", async () => {
      const { useThemeStore } = await import("./themeStore");

      useThemeStore.getState().setTheme("dark");

      expect(useThemeStore.getState().theme).toBe("dark");
      expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "dark");
      expect(classListMock.toggle).toHaveBeenCalledWith("dark", true);
    });

    it("sets theme to light", async () => {
      localStorageMock.getItem.mockReturnValue("dark");
      const { useThemeStore } = await import("./themeStore");

      useThemeStore.getState().setTheme("light");

      expect(useThemeStore.getState().theme).toBe("light");
      expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "light");
      expect(classListMock.toggle).toHaveBeenCalledWith("dark", false);
    });
  });

  describe("toggleTheme", () => {
    it("toggles from light to dark", async () => {
      localStorageMock.getItem.mockReturnValue(null as unknown as string);
      const { useThemeStore } = await import("./themeStore");
      expect(useThemeStore.getState().theme).toBe("light");

      useThemeStore.getState().toggleTheme();

      expect(useThemeStore.getState().theme).toBe("dark");
      expect(classListMock.toggle).toHaveBeenCalledWith("dark", true);
    });

    it("toggles from dark to light", async () => {
      localStorageMock.getItem.mockReturnValue("dark");
      const { useThemeStore } = await import("./themeStore");

      useThemeStore.getState().toggleTheme();

      expect(useThemeStore.getState().theme).toBe("light");
    });
  });
});
