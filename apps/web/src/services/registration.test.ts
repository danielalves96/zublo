import { registrationService } from "./registration";

describe("registrationService", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks the public endpoint without letting a proxy cache the answer", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ open: true }) });

    await expect(registrationService.isOpen()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/registration-status", {
      cache: "no-store",
    });
  });

  it("reports a closed instance", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ open: false }) });
    await expect(registrationService.isOpen()).resolves.toBe(false);
  });

  it("treats a body without the flag as closed rather than guessing", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) });
    await expect(registrationService.isOpen()).resolves.toBe(false);

    fetchMock.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(null) });
    await expect(registrationService.isOpen()).resolves.toBe(false);
  });

  it("rejects when the endpoint is unavailable, so callers can pick a fallback", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: vi.fn() });
    await expect(registrationService.isOpen()).rejects.toThrow("registration status unavailable");
  });
});
