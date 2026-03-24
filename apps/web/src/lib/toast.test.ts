import { toast } from "./toast";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

describe("toast", () => {
  it("re-exports toast from sonner", () => {
    expect(toast).toBeDefined();
    expect(toast.success).toBeDefined();
    expect(toast.error).toBeDefined();
    expect(toast.info).toBeDefined();
  });
});
