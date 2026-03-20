import type { PaymentRecord } from "@/types";

vi.mock("@/lib/pb", () => ({
  default: {
    collection: vi.fn(),
    filter: vi.fn(),
    files: {
      getUrl: vi.fn(),
    },
  },
}));

import pb from "@/lib/pb";

import { paymentRecordsService } from "./paymentRecords";

function getCollectionMock(overrides: Record<string, unknown> = {}) {
  return {
    getFullList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  };
}

describe("paymentRecordsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists records for a user and for a subscription", async () => {
    const getFullList = vi.fn().mockResolvedValue([]);
    (pb.filter as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce("filter:user-1")
      .mockReturnValueOnce("filter:sub-1:user-1");
    (pb.collection as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(getCollectionMock({ getFullList }))
      .mockReturnValueOnce(getCollectionMock({ getFullList }));

    await paymentRecordsService.listForUser("user-1");
    await paymentRecordsService.listForSubscription("sub-1", "user-1");

    expect(getFullList).toHaveBeenNthCalledWith(1, {
      filter: "filter:user-1",
    });
    expect(getFullList).toHaveBeenNthCalledWith(2, {
      filter: "filter:sub-1:user-1",
    });
  });

  it("creates and updates payment records", async () => {
    const create = vi.fn();
    const update = vi.fn();
    const formData = new FormData();
    formData.append("notes", "paid");
    (pb.collection as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(getCollectionMock({ create }))
      .mockReturnValueOnce(getCollectionMock({ update }));

    await paymentRecordsService.create(formData);
    await paymentRecordsService.update("pr-1", { notes: "updated" });

    expect(create).toHaveBeenCalledWith(formData);
    expect(update).toHaveBeenCalledWith("pr-1", { notes: "updated" });
  });

  it("returns null without proof and builds a proof URL when present", () => {
    const withoutProof = { id: "pr-1" } as PaymentRecord;
    const withProof = { id: "pr-2", proof: "receipt.pdf" } as PaymentRecord;
    (pb.files.getUrl as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "https://cdn.example.com/receipt.pdf",
    );

    expect(paymentRecordsService.proofUrl(withoutProof)).toBeNull();
    expect(paymentRecordsService.proofUrl(withProof)).toBe(
      "https://cdn.example.com/receipt.pdf",
    );
    expect(pb.files.getUrl).toHaveBeenCalledWith(
      { collectionId: "payment_records", id: "pr-2" },
      "receipt.pdf",
    );
  });
});
