import { toast } from "./toast";

describe("toast", () => {
  it("re-exports toast from sonner", () => {
    expect(toast).toBeDefined();
    expect(typeof toast).toBe("function");
  });

  it("re-exports toast.success from sonner", () => {
    expect(toast.success).toBeDefined();
    expect(typeof toast.success).toBe("function");
  });

  it("re-exports toast.error from sonner", () => {
    expect(toast.error).toBeDefined();
    expect(typeof toast.error).toBe("function");
  });

  it("re-exports toast.info from sonner", () => {
    expect(toast.info).toBeDefined();
    expect(typeof toast.info).toBe("function");
  });
});
