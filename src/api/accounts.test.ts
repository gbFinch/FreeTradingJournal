import { describe, expect, it, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { getAccounts, createAccount } from "./accounts";
import type { Account } from "@/types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockAccount: Account = {
  id: "acc-1",
  user_id: "user-1",
  name: "Main Trading",
  base_currency: "USD",
  created_at: "2024-01-01T00:00:00Z",
};

describe("accounts API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAccounts", () => {
    it("calls invoke with get_accounts command", async () => {
      vi.mocked(invoke).mockResolvedValue([mockAccount]);

      await getAccounts();

      expect(invoke).toHaveBeenCalledWith("get_accounts");
    });

    it("returns accounts from invoke", async () => {
      vi.mocked(invoke).mockResolvedValue([mockAccount]);

      const result = await getAccounts();

      expect(result).toEqual([mockAccount]);
    });

    it("returns empty array when no accounts", async () => {
      vi.mocked(invoke).mockResolvedValue([]);

      const result = await getAccounts();

      expect(result).toEqual([]);
    });
  });

  describe("createAccount", () => {
    it("calls invoke with create_account command and name", async () => {
      vi.mocked(invoke).mockResolvedValue(mockAccount);

      await createAccount("Main Trading");

      expect(invoke).toHaveBeenCalledWith("create_account", {
        name: "Main Trading",
        baseCurrency: undefined,
      });
    });

    it("calls invoke with create_account command, name and currency", async () => {
      vi.mocked(invoke).mockResolvedValue(mockAccount);

      await createAccount("Main Trading", "EUR");

      expect(invoke).toHaveBeenCalledWith("create_account", {
        name: "Main Trading",
        baseCurrency: "EUR",
      });
    });

    it("returns created account from invoke", async () => {
      vi.mocked(invoke).mockResolvedValue(mockAccount);

      const result = await createAccount("Main Trading", "USD");

      expect(result).toEqual(mockAccount);
    });
  });
});
