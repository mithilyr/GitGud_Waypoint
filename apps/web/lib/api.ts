// The one place the web app talks to the FastAPI service.
// The browser calls same-origin /api/*, which Next proxies to the API (see next.config.ts), so the
// app needs no CORS setup and no API URL baked into the client bundle.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const TOKEN_KEY = "wp_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode: the session simply will not survive a reload */
  }
}

// Set by the driver app's "simulate no signal" switch (and true on a real network failure).
let forceOffline = false;
export function setForceOffline(v: boolean) {
  forceOffline = v;
}
export function isForcedOffline() {
  return forceOffline;
}

async function detail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return body.detail.map((d: { msg: string }) => d.msg).join("; ");
  } catch {
    /* not JSON */
  }
  return `${res.status} ${res.statusText}`;
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  if (forceOffline) throw new TypeError("offline (simulated)");
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`/api${path}`, { ...init, headers, body, cache: "no-store" });
  if (!res.ok) throw new ApiError(res.status, await detail(res));
  return res.json() as Promise<T>;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, json?: unknown) => api<T>(path, { method: "POST", json: json ?? {} });

/** True for failures that mean "no connection" rather than "the server said no". */
export function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError;
}

/** Server-side (Next server components only): direct call to the API container. */
export async function serverGet<T>(path: string): Promise<T> {
  const base = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) throw new ApiError(res.status, `GET ${path} failed`);
  return res.json() as Promise<T>;
}
