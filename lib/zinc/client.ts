interface ZincRequestOptions {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  timeout?: number;
}

export class ZincAPIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ZincAPIError';
  }
}

export class ZincClient {
  private baseURL = 'https://api.zinc.io/v1';
  private authHeader: string;

  constructor(clientToken: string) {
    if (!clientToken) {
      throw new Error('Zinc client token is required');
    }
    // Basic auth with token as username and empty password
    const credentials = Buffer.from(`${clientToken}:`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  async request<T>({ path, method = 'GET', body, timeout = 30000 }: ZincRequestOptions): Promise<T> {
    const url = `${this.baseURL}${path}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new ZincAPIError(
          data.message || `Request failed with status ${response.status}`,
          data.code,
          response.status,
          data.data
        );
      }

      return data as T;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new ZincAPIError('Request timeout', 'timeout');
      }
      if (error instanceof ZincAPIError) {
        throw error;
      }
      throw new ZincAPIError(error.message || 'Unknown error occurred');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Create singleton instance
let zincClient: ZincClient | null = null;

export function getZincClient(): ZincClient {
  if (!zincClient) {
    const token = process.env.ZINC_CLIENT_TOKEN;
    if (!token) {
      throw new Error('ZINC_CLIENT_TOKEN environment variable is not set');
    }
    zincClient = new ZincClient(token);
  }
  return zincClient;
}