import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAccountsStore } from "./accountsStore";
import * as api from "@/api";
import type { Account } from "@/types";

vi.mock("@/api");

const mockAccount: Account = {
  id: "acc-1",
  user_id: "user-1",
  name: "Main Trading",
  base_currency: "USD",
  created_at: "2024-01-01T00:00:00Z",
};

const mockAccount2: Account = {
  id: "acc-2",
  user_id: "user-1",
  name: "Paper Trading",
  base_currency: "USD",
  created_at: "2024-01-02T00:00:00Z",
};

describe("useAccountsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useAccountsStore.setState({
      accounts: [],
      selectedAccountId: null,
      isLoading: false,
      error: null,
    });
  });

  describe("initial state", () => {
    it("has correct initial state", () => {
      const state = useAccountsStore.getState();
      expect(state.accounts).toEqual([]);
      expect(state.selectedAccountId).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchAccounts", () => {
    it("fetches accounts and updates state", async () => {
      vi.mocked(api.getAccounts).mockResolvedValue([mockAccount, mockAccount2]);

      await useAccountsStore.getState().fetchAccounts();

      const state = useAccountsStore.getState();
      expect(state.accounts).toHaveLength(2);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("auto-selects first account when none selected", async () => {
      vi.mocked(api.getAccounts).mockResolvedValue([mockAccount, mockAccount2]);

      await useAccountsStore.getState().fetchAccounts();

      expect(useAccountsStore.getState().selectedAccountId).toBe("acc-1");
    });

    it("preserves existing selection when accounts fetched", async () => {
      vi.mocked(api.getAccounts).mockResolvedValue([mockAccount, mockAccount2]);
      useAccountsStore.setState({ selectedAccountId: "acc-2" });

      await useAccountsStore.getState().fetchAccounts();

      expect(useAccountsStore.getState().selectedAccountId).toBe("acc-2");
    });

    it("does not auto-select when accounts list is empty", async () => {
      vi.mocked(api.getAccounts).mockResolvedValue([]);

      await useAccountsStore.getState().fetchAccounts();

      expect(useAccountsStore.getState().selectedAccountId).toBeNull();
    });

    it("sets loading state while fetching", async () => {
      let resolvePromise: (value: Account[]) => void;
      vi.mocked(api.getAccounts).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const fetchPromise = useAccountsStore.getState().fetchAccounts();
      expect(useAccountsStore.getState().isLoading).toBe(true);

      resolvePromise!([mockAccount]);
      await fetchPromise;

      expect(useAccountsStore.getState().isLoading).toBe(false);
    });

    it("handles fetch error", async () => {
      vi.mocked(api.getAccounts).mockRejectedValue(new Error("Network error"));

      await useAccountsStore.getState().fetchAccounts();

      const state = useAccountsStore.getState();
      expect(state.error).toBe("Error: Network error");
      expect(state.isLoading).toBe(false);
    });
  });

  describe("createAccount", () => {
    it("creates account and refreshes list", async () => {
      vi.mocked(api.createAccount).mockResolvedValue(mockAccount);
      vi.mocked(api.getAccounts).mockResolvedValue([mockAccount]);

      const result = await useAccountsStore
        .getState()
        .createAccount("Main Trading", "USD");

      expect(result).toEqual(mockAccount);
      expect(api.createAccount).toHaveBeenCalledWith("Main Trading", "USD");
      expect(api.getAccounts).toHaveBeenCalled();
    });

    it("creates account with default currency", async () => {
      vi.mocked(api.createAccount).mockResolvedValue(mockAccount);
      vi.mocked(api.getAccounts).mockResolvedValue([mockAccount]);

      await useAccountsStore.getState().createAccount("Main Trading");

      expect(api.createAccount).toHaveBeenCalledWith("Main Trading", undefined);
    });

    it("handles create error and rethrows", async () => {
      vi.mocked(api.createAccount).mockRejectedValue(
        new Error("Duplicate name")
      );

      await expect(
        useAccountsStore.getState().createAccount("Main Trading")
      ).rejects.toThrow("Duplicate name");

      expect(useAccountsStore.getState().error).toBe("Error: Duplicate name");
      expect(useAccountsStore.getState().isLoading).toBe(false);
    });
  });

  describe("setSelectedAccount", () => {
    it("sets selected account id", () => {
      useAccountsStore.getState().setSelectedAccount("acc-2");

      expect(useAccountsStore.getState().selectedAccountId).toBe("acc-2");
    });

    it("clears selection when null", () => {
      useAccountsStore.setState({ selectedAccountId: "acc-1" });

      useAccountsStore.getState().setSelectedAccount(null);

      expect(useAccountsStore.getState().selectedAccountId).toBeNull();
    });
  });

  describe("clearError", () => {
    it("clears error state", () => {
      useAccountsStore.setState({ error: "Some error" });

      useAccountsStore.getState().clearError();

      expect(useAccountsStore.getState().error).toBeNull();
    });
  });
});
