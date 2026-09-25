import type { Context } from "hono";

export interface RequestCookies {
  get(name: string): string | undefined;
  getAll(): Record<string, string>;
  has(name: string): boolean;
}

export interface RequestQuery {
  get(name: string): string | null;
  getAll(name: string): string[];
  has(name: string): boolean;
  toObject(): Record<string, string | string[]>;
}

/**
 * CiferRequest wraps incoming HTTP requests with high-productivity utilities,
 * query parsers, cookie accessors, and typed body extractors.
 */
export class CiferRequest {
  public readonly raw: Request;
  public readonly honoContext: Context;
  public readonly url: URL;
  public readonly pathname: string;
  public readonly method: string;
  public readonly headers: Headers;

  private _cookies?: RequestCookies;
  private _query?: RequestQuery;
  private _cachedJson?: unknown;

  constructor(c: Context) {
    this.honoContext = c;
    this.raw = c.req.raw;
    this.url = new URL(c.req.raw.url || c.req.url);
    this.pathname = this.url.pathname;
    this.method = c.req.method;
    this.headers = c.req.raw.headers;
  }

  /**
   * Access query string parameters as typed helpers or plain objects.
   */
  public get query(): RequestQuery {
    if (!this._query) {
      const searchParams = this.url.searchParams;
      this._query = {
        get: (name: string) => searchParams.get(name),
        getAll: (name: string) => searchParams.getAll(name),
        has: (name: string) => searchParams.has(name),
        toObject: () => {
          const obj: Record<string, string | string[]> = {};
          for (const key of searchParams.keys()) {
            const values = searchParams.getAll(key);
            obj[key] = values.length === 1 ? values[0]! : values;
          }
          return obj;
        },
      };
    }
    return this._query;
  }

  /**
   * Access request cookies with instant parsing.
   */
  public get cookies(): RequestCookies {
    if (!this._cookies) {
      const cookieHeader = this.headers.get("cookie") || "";
      const parsed: Record<string, string> = {};
      if (cookieHeader) {
        cookieHeader.split(";").forEach((pair) => {
          const [key, ...values] = pair.trim().split("=");
          if (key) {
            parsed[key] = decodeURIComponent(values.join("="));
          }
        });
      }
      this._cookies = {
        get: (name: string) => parsed[name],
        getAll: () => ({ ...parsed }),
        has: (name: string) => name in parsed,
      };
    }
    return this._cookies;
  }

  /**
   * Resolves client IP address across standard proxy/edge headers.
   */
  public get ip(): string | undefined {
    return (
      this.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      this.headers.get("x-real-ip") ||
      this.headers.get("cf-connecting-ip") ||
      this.headers.get("x-client-ip") ||
      undefined
    );
  }
  
  /**
   * Parses request body as typed JSON.
   */
  public async json<T = unknown>(): Promise<T> {
    if (this._cachedJson !== undefined) {
      return this._cachedJson as T;
    }
    try {
      this._cachedJson = await this.raw.json();
      return this._cachedJson as T;
    } catch {
      return undefined as unknown as T;
    }
  }

  /**
   * Parses request body as plain text.
   */
  public async text(): Promise<string> {
    return this.raw.text();
  }

  /**
   * Parses multipart or URL-encoded form data.
   */
  public async formData(): Promise<FormData> {
    return this.raw.formData();
  }

  /**
   * Parses body as ArrayBuffer for binary payloads.
   */
  public async arrayBuffer(): Promise<ArrayBuffer> {
    return this.raw.arrayBuffer();
  }
}
