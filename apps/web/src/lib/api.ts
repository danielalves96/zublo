/**
 * Authenticated HTTP client built on top of native `fetch`.
 *
 * Automatically injects `Authorization: Bearer <pb token>` so callers
 * never have to touch `pb.authStore` directly.
 */
import pb from "./pb";

type ApiError = { error?: string; message?: string };

function normalizePath(path: string): string {
  if (!path) return path;
  // Absolute URL (http/https) or protocol-relative URL
  if (/^(https?:)?\/\//i.test(path)) return path;
  // Already absolute in current origin
  if (path.startsWith("/")) return path;
  // Prevent accidental relative fetch from nested routes (e.g. /chat/api/...)
  return `/${path}`;
}

function isJsonResponse(contentType: string | null): boolean {
  if (!contentType) return false;
  return (
    contentType.includes("application/json") || contentType.includes("+json")
  );
}

async function request<T = void>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers: customHeaders, ...rest } = init;
  const normalizedPath = normalizePath(path);

  async function doFetch(url: string) {
    return fetch(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pb.authStore.token}`,
        ...customHeaders,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  }

  let res = await doFetch(normalizedPath);

  // Dev fallback: if /api resolves to app-shell HTML, retry against
  // PocketBase directly to bypass proxy/base-path mismatch.
  const firstContentType = res.headers.get("content-type") || "";
  const isLocalDevHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (
    isLocalDevHost &&
    normalizedPath.startsWith("/api/") &&
    firstContentType.includes("text/html")
  ) {
    try {
      res = await doFetch(`http://localhost:8080${normalizedPath}`);
    } catch (_) {
      // Keep original response if direct retry fails
    }
  }

  const contentType = res.headers.get("content-type");

  if (!res.ok) {
    if (isJsonResponse(contentType)) {
      const data: ApiError = await res.json().catch(() => ({}));
      throw new Error(data.error ?? data.message ?? `HTTP ${res.status}`);
    }

    const raw = await res.text().catch(() => "");
    const snippet = raw.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      `HTTP ${res.status} (${contentType ?? "unknown"}) ${snippet}`,
    );
  }

  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as T;

  if (!isJsonResponse(contentType)) {
    const raw = await res.text().catch(() => "");
    const snippet = raw.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      `Expected JSON but received ${contentType ?? "unknown"} for ${res.url || normalizedPath}: ${snippet}`,
    );
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T = void>(path: string, init?: RequestInit) => request<T>(path, { method: "GET", ...init }),
  post: <T = void>(path: string, json?: unknown, init?: RequestInit) =>
    request<T>(path, { method: "POST", json, ...init }),
  put: <T = void>(path: string, json?: unknown, init?: RequestInit) =>
    request<T>(path, { method: "PUT", json, ...init }),
  patch: <T = void>(path: string, json?: unknown, init?: RequestInit) =>
    request<T>(path, { method: "PATCH", json, ...init }),
  del: <T = void>(path: string, init?: RequestInit) => request<T>(path, { method: "DELETE", ...init }),

  /**
   * Multipart/form-data upload — omits `Content-Type` so the browser sets
   * the boundary automatically.
   */
  postForm: <T = void>(path: string, body: FormData): Promise<T> =>
    fetch(normalizePath(path), {
      method: "POST",
      headers: { Authorization: `Bearer ${pb.authStore.token}` },
      body,
    }).then(async (res) => {
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (isJsonResponse(contentType)) {
          const data: ApiError = await res.json().catch(() => ({}));
          throw new Error(data.error ?? data.message ?? `HTTP ${res.status}`);
        }
        const raw = await res.text().catch(() => "");
        const snippet = raw.slice(0, 120).replace(/\s+/g, " ");
        throw new Error(
          `HTTP ${res.status} (${contentType ?? "unknown"}) ${snippet}`,
        );
      }
      if (res.status === 204) return undefined as T;

      if (!isJsonResponse(contentType)) {
        const raw = await res.text().catch(() => "");
        const snippet = raw.slice(0, 120).replace(/\s+/g, " ");
        throw new Error(
          `Expected JSON but received ${contentType ?? "unknown"}: ${snippet}`,
        );
      }

      return res.json() as Promise<T>;
    }),
};
