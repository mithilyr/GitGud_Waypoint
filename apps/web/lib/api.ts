// Single place the web app talks to the FastAPI service.
// Browser code uses the public URL; server components (running inside the web
// container) use API_INTERNAL_URL, e.g. http://api:8000 in Docker Compose.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function baseUrl(): string {
  if (typeof window === "undefined") return process.env.API_INTERNAL_URL ?? API_URL;
  return API_URL;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}
