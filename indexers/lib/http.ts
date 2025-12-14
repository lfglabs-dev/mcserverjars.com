export class HttpError extends Error {
  public readonly url: string;
  public readonly status: number | null;
  public readonly bodySnippet: string | null;

  constructor(args: {
    message: string;
    url: string;
    status: number | null;
    bodySnippet?: string | null;
  }) {
    super(args.message);
    this.name = "HttpError";
    this.url = args.url;
    this.status = args.status;
    this.bodySnippet = args.bodySnippet ?? null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  // Common transient failures and rate-limits.
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...`;
}

export type FetchJsonOptions<T> = {
  init?: RequestInit;
  timeoutMs?: number;
  retries?: number;
  retryBaseDelayMs?: number;
  parse?: (value: unknown) => T;
};

/**
 * Fetch JSON reliably (timeouts + retries + better errors).
 * Designed for GitHub Actions scheduled jobs where upstream APIs may transiently fail.
 */
export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions<T> = {}
): Promise<T> {
  const {
    init,
    timeoutMs = 20_000,
    retries = 4,
    retryBaseDelayMs = 750,
    parse,
  } = options;

  const headers = new Headers(init?.headers);
  if (!headers.has("user-agent")) {
    headers.set("user-agent", "mcserverjars-indexers/1.0");
  }
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...init,
        headers,
        signal: controller.signal,
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const bodySnippet = bodyText ? truncate(bodyText.replace(/\s+/g, " "), 300) : null;

        if (attempt < retries && isRetryableStatus(res.status)) {
          const delayMs = retryBaseDelayMs * Math.pow(2, attempt);
          await sleep(delayMs);
          continue;
        }

        throw new HttpError({
          message: `HTTP ${res.status} when fetching JSON`,
          url,
          status: res.status,
          bodySnippet,
        });
      }

      const text = await res.text();
      let json: unknown;
      try {
        json = text.length ? JSON.parse(text) : null;
      } catch (error) {
        throw new HttpError({
          message: `Invalid JSON response`,
          url,
          status: res.status,
          bodySnippet: truncate(text.replace(/\s+/g, " "), 300),
        });
      }

      return parse ? parse(json) : (json as T);
    } catch (error) {
      lastError = error;

      // Abort / network errors can be transient.
      if (attempt < retries) {
        const delayMs = retryBaseDelayMs * Math.pow(2, attempt);
        await sleep(delayMs);
        continue;
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Should be unreachable, but keeps TS happy.
  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to fetch JSON from ${url}`);
}


