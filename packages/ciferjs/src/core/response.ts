const INTERNALS = Symbol("internal response");

export interface CookieOptions {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none" | "Strict" | "Lax" | "None";
  priority?: "low" | "medium" | "high" | "Low" | "Medium" | "High";
  partitioned?: boolean;
}

export interface ResponseCookie extends CookieOptions {
  name: string;
  value: string;
}

export interface MiddlewareResponseInit extends ResponseInit {
  request?: {
    headers?: HeadersInit;
  };
}

export class ResponseCookies {
  private _headers: Headers;

  constructor(headers: Headers) {
    this._headers = headers;
  }

  public get(name: string): ResponseCookie | undefined {
    return this.getAll().find((c) => c.name === name);
  }

  public getAll(): ResponseCookie[] {
    const cookies: ResponseCookie[] = [];
    const rawHeaders = (this._headers as any).getSetCookie
      ? (this._headers as any).getSetCookie()
      : (this._headers.get("Set-Cookie") || "").split(/,(?=\s*[^;=]+=[^;=]+)/);

    for (const raw of rawHeaders) {
      if (!raw || !raw.trim()) continue;
      const parts = raw.split(";").map((p: string) => p.trim());
      const [first, ...attributes] = parts;
      if (!first) continue;
      const [name, ...val] = first.split("=");
      if (!name) continue;

      const cookie: ResponseCookie = {
        name: decodeURIComponent(name.trim()),
        value: decodeURIComponent(val.join("=").trim()),
      };

      for (const attr of attributes) {
        const [k, ...v] = attr.split("=");
        const key = k?.trim().toLowerCase();
        const value = v.join("=").trim();

        if (key === "path") cookie.path = value;
        else if (key === "domain") cookie.domain = value;
        else if (key === "max-age") cookie.maxAge = parseInt(value, 10);
        else if (key === "expires") cookie.expires = new Date(value);
        else if (key === "httponly") cookie.httpOnly = true;
        else if (key === "secure") cookie.secure = true;
        else if (key === "samesite") cookie.sameSite = value as any;
        else if (key === "priority") cookie.priority = value as any;
        else if (key === "partitioned") cookie.partitioned = true;
      }
      cookies.push(cookie);
    }
    return cookies;
  }

  public set(name: string, value: string, options?: CookieOptions): this;
  public set(options: ResponseCookie): this;
  public set(
    nameOrOptions: string | ResponseCookie,
    value?: string,
    options: CookieOptions = {},
  ): this {
    let name: string;
    let val: string;
    let opts: CookieOptions;

    if (typeof nameOrOptions === "object") {
      name = nameOrOptions.name;
      val = nameOrOptions.value;
      opts = nameOrOptions;
    } else {
      name = nameOrOptions;
      val = value ?? "";
      opts = options;
    }

    let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(val)}`;
    if (opts.path) cookieStr += `; Path=${opts.path}`;
    else cookieStr += "; Path=/";
    if (opts.domain) cookieStr += `; Domain=${opts.domain}`;
    if (opts.maxAge !== undefined) cookieStr += `; Max-Age=${opts.maxAge}`;
    if (opts.expires) cookieStr += `; Expires=${opts.expires.toUTCString()}`;
    if (opts.httpOnly) cookieStr += "; HttpOnly";
    if (opts.secure) cookieStr += "; Secure";
    if (opts.sameSite) {
      const s = opts.sameSite.charAt(0).toUpperCase() + opts.sameSite.slice(1).toLowerCase();
      cookieStr += `; SameSite=${s}`;
    }
    if (opts.priority) cookieStr += `; Priority=${opts.priority}`;
    if (opts.partitioned) cookieStr += "; Partitioned";

    this._headers.append("Set-Cookie", cookieStr);
    return this;
  }

  public delete(
    nameOrOptions: string | { name: string; path?: string; domain?: string },
  ): this {
    if (typeof nameOrOptions === "string") {
      return this.set({
        name: nameOrOptions,
        value: "",
        maxAge: 0,
        expires: new Date(0),
      });
    }
    return this.set({
      ...nameOrOptions,
      value: "",
      maxAge: 0,
      expires: new Date(0),
    });
  }

  public has(name: string): boolean {
    return this.get(name) !== undefined;
  }
}

/**
 * CiferResponse matches the exact NextResponse signature:
 * - json<JsonBody>(body, init?)
 * - redirect(url, init?)
 * - next(init?)
 * - res.cookies (ResponseCookies)
 */
export class CiferResponse<Body = unknown> extends Response {
  public readonly [INTERNALS]: {
    cookies: ResponseCookies;
    url?: URL;
    body?: Body;
  };

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    super(body, init);
    this[INTERNALS] = {
      cookies: new ResponseCookies(this.headers),
    };
  }

  public get cookies(): ResponseCookies {
    return this[INTERNALS].cookies;
  }

  public static override json<JsonBody>(
    body: JsonBody,
    init?: ResponseInit,
  ): CiferResponse<JsonBody> {
    const headers = new Headers(init?.headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const res = new CiferResponse<JsonBody>(JSON.stringify(body), {
      ...init,
      headers,
    });
    res[INTERNALS].body = body;
    return res;
  }

  public static override redirect(
    url: string | URL,
    init?: number | ResponseInit,
  ): CiferResponse<unknown> {
    const status = typeof init === "number" ? init : init?.status ?? 307;
    const headers = new Headers(typeof init === "object" ? init.headers : undefined);
    headers.set("Location", typeof url === "string" ? url : url.toString());
    const res = new CiferResponse<unknown>(null, {
      ...(typeof init === "object" ? init : {}),
      status,
      headers,
    });
    res[INTERNALS].url = typeof url === "string" ? new URL(url, "http://localhost") : url;
    return res;
  }

  public static next(init?: MiddlewareResponseInit): CiferResponse<unknown> {
    const headers = new Headers(init?.headers);
    headers.set("x-middleware-next", "1");
    if (init?.request?.headers) {
      new Headers(init.request.headers).forEach((v, k) => headers.set(k, v));
    }
    return new CiferResponse<unknown>(null, {
      ...init,
      headers,
    });
  }
}