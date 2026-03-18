/**
 * Authenticated HTTP client built on top of native `fetch`.
 *
 * Automatically injects `Authorization: Bearer <pb token>` so callers
 * never have to touch `pb.authStore` directly.
 */
import pb from "./pb";

type ApiError = { error?: string; message?: string };

async function request<T = void>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers: customHeaders, ...rest } = init;

  const res = await fetch(path, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pb.authStore.token}`,
      ...customHeaders,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (!res.ok) {
    const data: ApiError = await res.json().catch(() => ({}));
    throw new Error(data.error ?? data.message ?? `HTTP ${res.status}`);
  }

  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get:   <T = void>(path: string)                  => request<T>(path, { method: "GET" }),
  post:  <T = void>(path: string, json?: unknown)  => request<T>(path, { method: "POST", json }),
  patch: <T = void>(path: string, json?: unknown)  => request<T>(path, { method: "PATCH", json }),
  del:   <T = void>(path: string)                  => request<T>(path, { method: "DELETE" }),

  /**
   * Multipart/form-data upload — omits `Content-Type` so the browser sets
   * the boundary automatically.
   */
  postForm: <T = void>(path: string, body: FormData): Promise<T> =>
    fetch(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${pb.authStore.token}` },
      body,
    }).then(async (res) => {
      if (!res.ok) {
        const data: ApiError = await res.json().catch(() => ({}));
        throw new Error(data.error ?? data.message ?? `HTTP ${res.status}`);
      }
      if (res.status === 204) return undefined as T;
      return res.json() as Promise<T>;
    }),
};
