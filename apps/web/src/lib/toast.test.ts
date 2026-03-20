const { toast } = vi.hoisted(() => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast,
}));

import { toast as exportedToast } from "./toast";

describe("toast", () => {
  it("re-exports the sonner toast instance", () => {
    expect(exportedToast).toBe(toast);
  });
});
