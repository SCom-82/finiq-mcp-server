import type { Config } from '../config/schema.js';

export interface ApiResponse {
  status: number;
  ok: boolean;
  data: unknown;
  headers: Record<string, string>;
}

/**
 * HTTP client for the Finance API with X-ApiKey authentication.
 */
export class FinanceApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: Config) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  async request(
    method: string,
    path: string,
    options?: {
      query?: Record<string, string>;
      body?: unknown;
    },
  ): Promise<ApiResponse> {
    let url = `${this.baseUrl}${path}`;

    // Add query parameters
    if (options?.query && Object.keys(options.query).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      'X-ApiKey': this.apiKey,
      'Accept': 'application/json',
    };

    let bodyStr: string | undefined;
    if (options?.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      bodyStr = JSON.stringify(options.body);
    }

    const response = await fetch(url, {
      method,
      headers,
      body: bodyStr,
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let data: unknown;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text || null;
    }

    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: responseHeaders,
    };
  }
}
