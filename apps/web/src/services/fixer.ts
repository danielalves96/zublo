import pb from "@/lib/pb";
import { api } from "@/lib/api";
import type { FixerSettings } from "@/types";

export const fixerService = {
  getSettings: async (userId: string): Promise<FixerSettings | null> => {
    try {
      const result = await pb.collection("fixer_settings").getList<FixerSettings>(1, 1, {
        filter: pb.filter("user = {:userId}", { userId }),
      });
      return result.items[0] ?? null;
    } catch {
      return null;
    }
  },

  createSettings: (data: Partial<FixerSettings>) =>
    pb.collection("fixer_settings").create<FixerSettings>(data),

  updateSettings: (id: string, data: Partial<FixerSettings>) =>
    pb.collection("fixer_settings").update<FixerSettings>(id, data),

  updateRates: () =>
    api.post<{ updated: number; base: string }>("/api/fixer/update", {}),

  /** Returns the ISO timestamp of the last successful exchange rate update, or null. */
  getLastUpdate: async (): Promise<string | null> => {
    try {
      const result = await pb.collection("exchange_log").getList(1, 1, {
        sort: "-last_update",
      });
      return result.items[0]?.get?.("last_update") as string ?? result.items[0]?.["last_update"] ?? null;
    } catch {
      return null;
    }
  },
};
