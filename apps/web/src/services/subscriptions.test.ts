import type { Subscription } from "@/types";

vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("@/lib/pb", () => ({
  default: {
    collection: vi.fn(),
    filter: vi.fn(),
    files: {
      getUrl: vi.fn(),
    },
  },
}));

import { api } from "@/lib/api";
import pb from "@/lib/pb";

import { subscriptionsService } from "./subscriptions";

function getCollectionMock(overrides: Record<string, unknown> = {}) {
  return {
    getFullList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  };
}

describe("subscriptionsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists subscriptions with the expected expand configuration", async () => {
    const getFullList = vi.fn().mockResolvedValue([]);
    (pb.filter as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce("filter:all:user-1")
      .mockReturnValueOnce("filter:active:user-1")
      .mockReturnValueOnce("filter:active-expanded:user-1");
    (pb.collection as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(getCollectionMock({ getFullList }))
      .mockReturnValueOnce(getCollectionMock({ getFullList }))
      .mockReturnValueOnce(getCollectionMock({ getFullList }));

    await subscriptionsService.list("user-1");
    await subscriptionsService.listActive("user-1");
    await subscriptionsService.listActiveExpanded("user-1");

    expect(getFullList).toHaveBeenNthCalledWith(1, {
      filter: "filter:all:user-1",
      expand: "currency,cycle,category,payment_method,payer",
    });
    expect(getFullList).toHaveBeenNthCalledWith(2, {
      filter: "filter:active:user-1",
      expand: "currency,cycle",
    });
    expect(getFullList).toHaveBeenNthCalledWith(3, {
      filter: "filter:active-expanded:user-1",
      expand: "currency,cycle,category,payment_method,payer",
    });
  });

  it("creates, updates, and deletes subscriptions through PocketBase", async () => {
    const create = vi.fn().mockResolvedValue({ id: "sub-1" });
    const update = vi.fn().mockResolvedValue({ id: "sub-1" });
    const remove = vi.fn().mockResolvedValue(undefined);
    (pb.collection as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(getCollectionMock({ create }))
      .mockReturnValueOnce(getCollectionMock({ update }))
      .mockReturnValueOnce(getCollectionMock({ delete: remove }));

    const formData = new FormData();
    formData.append("name", "Netflix");

    await subscriptionsService.create(formData);
    await subscriptionsService.update("sub-1", { name: "Prime Video" });
    await subscriptionsService.delete("sub-1");

    expect(create).toHaveBeenCalledWith(formData);
    expect(update).toHaveBeenCalledWith("sub-1", { name: "Prime Video" });
    expect(remove).toHaveBeenCalledWith("sub-1");
  });

  it("proxies clone, renew, export, and import through the API client", async () => {
    (api.post as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: "clone-1" })
      .mockResolvedValueOnce({ id: "renew-1" })
      .mockResolvedValueOnce({ imported: 1, skipped: 0, errors: [] });
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      subscriptions: [],
    });

    const payload = [{ name: "Netflix" }];

    await subscriptionsService.clone("sub-1");
    await subscriptionsService.renew("sub-1");
    await subscriptionsService.export();
    await subscriptionsService.import(payload);

    expect(api.post).toHaveBeenNthCalledWith(1, "/api/subscription/clone", {
      id: "sub-1",
    });
    expect(api.post).toHaveBeenNthCalledWith(2, "/api/subscription/renew", {
      id: "sub-1",
    });
    expect(api.get).toHaveBeenCalledWith("/api/subscriptions/export");
    expect(api.post).toHaveBeenNthCalledWith(3, "/api/subscriptions/import", {
      subscriptions: payload,
    });
  });

  it("returns null when there is no logo and builds the file URL otherwise", () => {
    const subWithoutLogo = {
      id: "sub-1",
      name: "Netflix",
    } as Subscription;
    const subWithLogo = {
      id: "sub-2",
      name: "Prime",
      logo: "prime.png",
    } as Subscription;

    (pb.files.getUrl as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "https://cdn.example.com/prime.png",
    );

    expect(subscriptionsService.logoUrl(subWithoutLogo)).toBeNull();
    expect(subscriptionsService.logoUrl(subWithLogo)).toBe(
      "https://cdn.example.com/prime.png",
    );
    expect(pb.files.getUrl).toHaveBeenCalledWith(
      { collectionId: "subscriptions", id: "sub-2" },
      "prime.png",
    );
  });
});
