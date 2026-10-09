import type { APIRequestContext, APIResponse } from '@playwright/test';

type Headers = Record<string, string>;

/**
 * Thin wrapper around Playwright's APIRequestContext.
 *
 * - Builds headers (default bearer token, content type).
 * - Keeps endpoints relative so the context's `baseURL` decides which API is hit,
 *   which is what lets the same step definitions drive both Legacy and Core.
 */
export class ApiClient {
  private defaultToken: string | null = null;

  constructor(private readonly request: APIRequestContext) {}

  get(endpoint: string, token?: string, headers?: Headers): Promise<APIResponse> {
    return this.request.get(this.url(endpoint), { headers: this.headers(token, headers) });
  }

  post(
    endpoint: string,
    body: unknown,
    token?: string,
    contentType = 'application/json',
    headers?: Headers,
  ): Promise<APIResponse> {
    return this.request.post(this.url(endpoint), {
      headers: this.headers(token, headers, contentType),
      data: body,
    });
  }

  put(
    endpoint: string,
    body: unknown,
    token?: string,
    contentType = 'application/json',
  ): Promise<APIResponse> {
    return this.request.put(this.url(endpoint), {
      headers: this.headers(token, undefined, contentType),
      data: body,
    });
  }

  patch(
    endpoint: string,
    body: unknown,
    token?: string,
    contentType = 'application/json',
  ): Promise<APIResponse> {
    return this.request.patch(this.url(endpoint), {
      headers: this.headers(token, undefined, contentType),
      data: body,
    });
  }

  delete(endpoint: string, token?: string): Promise<APIResponse> {
    return this.request.delete(this.url(endpoint), { headers: this.headers(token) });
  }

  /** Sets a token that is sent on every request that does not pass its own. */
  setToken(token: string): void {
    this.defaultToken = token;
  }

  clearToken(): void {
    this.defaultToken = null;
  }

  private url(endpoint: string): string {
    // Strip the leading slash so Playwright resolves it against baseURL.
    return endpoint.replace(/^\//, '');
  }

  private headers(token?: string, custom?: Headers, contentType?: string): Headers {
    const headers: Headers = { Accept: 'application/json', ...custom };
    if (contentType) headers['Content-Type'] = contentType;
    const bearer = token ?? this.defaultToken;
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    return headers;
  }
}
