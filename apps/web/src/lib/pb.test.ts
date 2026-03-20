describe("pb", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("creates the PocketBase client from the browser origin and disables auto cancellation", async () => {
    const autoCancellation = vi.fn();
    const PocketBase = vi.fn().mockImplementation(function (this: any, url: string) {
      this.baseUrl = url;
      this.authStore = { token: "token" };
      this.autoCancellation = autoCancellation;
    });

    vi.doMock("pocketbase", () => ({
      default: PocketBase,
    }));
    vi.stubGlobal("window", {
      location: {
        origin: "https://zublo.example.com",
      },
    });

    const { default: pb } = await import("./pb");

    expect(PocketBase).toHaveBeenCalledWith("https://zublo.example.com");
    expect(autoCancellation).toHaveBeenCalledWith(false);
    expect(pb).toMatchObject({
      baseUrl: "https://zublo.example.com",
    });
  });

  it("falls back to localhost when window is unavailable", async () => {
    const autoCancellation = vi.fn();
    const PocketBase = vi.fn().mockImplementation(function (this: any, url: string) {
      this.baseUrl = url;
      this.authStore = { token: "token" };
      this.autoCancellation = autoCancellation;
    });

    vi.doMock("pocketbase", () => ({
      default: PocketBase,
    }));
    vi.stubGlobal("window", undefined);

    const { default: pb } = await import("./pb");

    expect(PocketBase).toHaveBeenCalledWith("http://localhost:8080");
    expect(autoCancellation).toHaveBeenCalledWith(false);
    expect(pb).toMatchObject({
      baseUrl: "http://localhost:8080",
    });
  });
});
