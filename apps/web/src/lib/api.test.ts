const { token } = vi.hoisted(() => ({
  token: "test-token",
}));

vi.mock("./pb", () => ({
  default: {
    authStore: {
      token,
    },
  },
}));

import { api } from "./api";

type MockResponseOptions = {
  ok?: boolean;
  status?: number;
  contentType?: string | null;
  jsonData?: unknown;
  textData?: string;
  url?: string;
  jsonError?: Error;
};

function createMockResponse({
  ok = true,
  status = 200,
  contentType = "application/json",
  jsonData,
  textData = "",
  url = "https://api.example.com/resource",
  jsonError,
}: MockResponseOptions = {}) {
  return {
    ok,
    status,
    url,
    headers: {
      get: vi.fn((name: string) =>
        name.toLowerCase() === "content-type" ? contentType : null,
      ),
    },
    json: vi.fn(async () => {
      if (jsonError) {
        throw jsonError;
      }

      return jsonData;
    }),
    text: vi.fn(async () => textData),
  };
}

describe("api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("normalizes relative paths and sends JSON/auth headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        jsonData: { id: "item-1" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { hostname: "app.example.com" } });

    await expect(api.post("v1/items", { name: "Item" })).resolves.toEqual({
      id: "item-1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/items",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Item" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }),
      }),
    );
  });

  it("preserves empty, absolute, protocol-relative, and already-absolute paths", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(createMockResponse({ jsonData: { ok: true } }));

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { hostname: "app.example.com" } });

    await api.get("");
    await api.get("https://cdn.example.com/logo.svg");
    await api.get("//cdn.example.com/logo.svg");
    await api.get("/health");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://cdn.example.com/logo.svg",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "//cdn.example.com/logo.svg",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/health",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("uses the provided raw body when json is undefined", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        jsonData: { ok: true },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { hostname: "app.example.com" } });

    await api.post("/raw", undefined, {
      body: "raw-body",
      headers: {
        "X-Test": "true",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/raw",
      expect.objectContaining({
        body: "raw-body",
        headers: expect.objectContaining({
          "X-Test": "true",
          Authorization: `Bearer ${token}`,
        }),
      }),
    );
  });

  it("returns undefined for 204 responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        status: 204,
        contentType: null,
      }),
    );

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { hostname: "app.example.com" } });

    await expect(api.del("/items/1")).resolves.toBeUndefined();
  });

  it("supports PUT and PATCH helpers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createMockResponse({
          jsonData: { updated: true },
        }),
      )
      .mockResolvedValueOnce(
        createMockResponse({
          jsonData: { patched: true },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { hostname: "app.example.com" } });

    await expect(api.put("/items/1", { name: "Updated" })).resolves.toEqual({
      updated: true,
    });
    await expect(api.patch("/items/1", { active: false })).resolves.toEqual({
      patched: true,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/items/1",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/items/1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("throws the API error field for failed JSON responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 400,
        jsonData: { error: "Invalid input" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { hostname: "app.example.com" } });

    await expect(api.get("/items")).rejects.toThrow("Invalid input");
  });

  it("throws the API message field for failed +json responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 422,
        contentType: "application/problem+json",
        jsonData: { message: "Validation failed" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { hostname: "app.example.com" } });

    await expect(api.get("/items")).rejects.toThrow("Validation failed");
  });

  it("falls back to the HTTP status when failed JSON cannot be parsed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 503,
        jsonError: new Error("bad json"),
      }),
    );

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { hostname: "app.example.com" } });

    await expect(api.get("/items")).rejects.toThrow("HTTP 503");
  });

  it("throws a text-based error for non-JSON error responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 502,
        contentType: "text/plain",
        textData: "Gateway exploded with a long message",
      }),
    );

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { hostname: "app.example.com" } });

    await expect(api.get("/items")).rejects.toThrow(
      "HTTP 502 (text/plain) Gateway exploded with a long message",
    );
  });

  it("falls back to unknown content type and empty text when reading an error body fails", async () => {
    const response = createMockResponse({
      ok: false,
      status: 500,
      contentType: null,
    });
    response.text.mockRejectedValue(new Error("read failed"));
    const fetchMock = vi.fn().mockResolvedValue(response);

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { hostname: "app.example.com" } });

    await expect(api.get("/items")).rejects.toThrow("HTTP 500 (unknown) ");
  });

  it("throws when a successful response is not JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        contentType: "text/plain",
        textData: "ok",
        url: "https://api.example.com/items",
      }),
    );

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { hostname: "app.example.com" } });

    await expect(api.get("/items")).rejects.toThrow(
      "Expected JSON but received text/plain for https://api.example.com/items: ok",
    );
  });

  it("falls back to the normalized path and empty body when reading a non-JSON success body fails", async () => {
    const response = createMockResponse({
      contentType: null,
      url: "",
    });
    response.text.mockRejectedValue(new Error("read failed"));
    const fetchMock = vi.fn().mockResolvedValue(response);

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { hostname: "app.example.com" } });

    await expect(api.get("items")).rejects.toThrow(
      "Expected JSON but received unknown for /items: ",
    );
  });

  it("retries PocketBase directly in local development when /api returns HTML", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createMockResponse({
          contentType: "text/html",
          textData: "<!doctype html>",
        }),
      )
      .mockResolvedValueOnce(
        createMockResponse({
          jsonData: [{ id: "user-1" }],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { hostname: "localhost" } });

    await expect(api.get("/api/users")).resolves.toEqual([{ id: "user-1" }]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8080/api/users",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("keeps the original response when the local development retry fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createMockResponse({
          contentType: "text/html",
          textData: "<html>shell</html>",
          url: "http://localhost:5173/api/users",
        }),
      )
      .mockRejectedValueOnce(new Error("connection refused"));

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { hostname: "127.0.0.1" } });

    await expect(api.get("/api/users")).rejects.toThrow(
      "Expected JSON but received text/html for http://localhost:5173/api/users: <html>shell</html>",
    );
  });

  it("uploads form data without forcing Content-Type and parses JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        jsonData: { uploaded: true },
      }),
    );
    const formData = new FormData();
    formData.append("file", new Blob(["hello"]), "hello.txt");

    vi.stubGlobal("fetch", fetchMock);

    await expect(api.postForm("/upload", formData)).resolves.toEqual({
      uploaded: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/upload",
      expect.objectContaining({
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    );
  });

  it("returns undefined for 204 form uploads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        status: 204,
        contentType: null,
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(api.postForm("/upload", new FormData())).resolves.toBeUndefined();
  });

  it("throws the API message for failed JSON form uploads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 400,
        jsonData: { message: "Bad upload" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(api.postForm("/upload", new FormData())).rejects.toThrow(
      "Bad upload",
    );
  });

  it("falls back to the HTTP status when a failed JSON form upload cannot be parsed", async () => {
    const response = createMockResponse({
      ok: false,
      status: 418,
      jsonError: new Error("bad json"),
    });
    const fetchMock = vi.fn().mockResolvedValue(response);

    vi.stubGlobal("fetch", fetchMock);

    await expect(api.postForm("/upload", new FormData())).rejects.toThrow(
      "HTTP 418",
    );
  });

  it("throws a text-based error for failed non-JSON form uploads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 500,
        contentType: null,
        textData: "server offline",
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(api.postForm("/upload", new FormData())).rejects.toThrow(
      "HTTP 500 (unknown) server offline",
    );
  });

  it("falls back to an empty body when reading a failed non-JSON form upload response fails", async () => {
    const response = createMockResponse({
      ok: false,
      status: 500,
      contentType: null,
    });
    response.text.mockRejectedValue(new Error("read failed"));
    const fetchMock = vi.fn().mockResolvedValue(response);

    vi.stubGlobal("fetch", fetchMock);

    await expect(api.postForm("/upload", new FormData())).rejects.toThrow(
      "HTTP 500 (unknown) ",
    );
  });

  it("throws when a successful form upload returns non-JSON content", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        contentType: "text/plain",
        textData: "uploaded",
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(api.postForm("/upload", new FormData())).rejects.toThrow(
      "Expected JSON but received text/plain: uploaded",
    );
  });

  it("falls back to an empty body when reading a successful non-JSON form upload response fails", async () => {
    const response = createMockResponse({
      contentType: null,
    });
    response.text.mockRejectedValue(new Error("read failed"));
    const fetchMock = vi.fn().mockResolvedValue(response);

    vi.stubGlobal("fetch", fetchMock);

    await expect(api.postForm("/upload", new FormData())).rejects.toThrow(
      "Expected JSON but received unknown: ",
    );
  });
});
