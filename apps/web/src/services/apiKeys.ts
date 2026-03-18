import { api } from "@/lib/api";
import type { ApiKey, ApiKeyCreated, ApiKeyPermission } from "@/types";

export const apiKeysService = {
  async list(): Promise<ApiKey[]> {
    const data = await api.get<{ items: ApiKey[] }>("/api/api-keys");
    return data.items ?? [];
  },

  async create(name: string, permissions: ApiKeyPermission[]): Promise<ApiKeyCreated> {
    return api.post<ApiKeyCreated>("/api/api-keys", { name, permissions });
  },

  async delete(id: string): Promise<void> {
    await api.del(`/api/api-keys/${id}`);
  },
};
