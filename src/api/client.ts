/**
 * Future Rust/Axum REST client. Not used while running local-first.
 * Base URL is read from VITE_API_BASE_URL at build time. Never hardcoded.
 * Auth tokens must NEVER be stored in localStorage — use HttpOnly cookies from
 * same-origin backend, with CSRF token read from a same-origin endpoint if needed.
 */
import { ApiError } from './types';

export interface ApiConfig { baseUrl: string; version?: string; }

export class ApiClient {
  constructor(private readonly cfg: ApiConfig) {}

  private url(path: string): string {
    const v = this.cfg.version ?? 'v1';
    return `${this.cfg.baseUrl.replace(/\/$/, '')}/api/${v}${path}`;
  }

  async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    init: RequestInit = {},
  ): Promise<T> {
    const controller = new AbortController();
    const signal = init.signal ?? controller.signal;
    const res = await fetch(this.url(path), {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(init.headers ?? {}),
      },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
    if (!res.ok) {
      let err: ApiError = { code: `HTTP_${res.status}`, message: res.statusText };
      try { err = await res.json(); } catch {}
      throw new ApiErrorImpl(err, res.status);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
}

export class ApiErrorImpl extends Error {
  constructor(public apiError: ApiError, public status: number) {
    super(apiError.message);
  }
}

/** Read base URL from deployment configuration. Never hardcode. */
export const apiClient = import.meta.env.VITE_API_BASE_URL
  ? new ApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL })
  : null;