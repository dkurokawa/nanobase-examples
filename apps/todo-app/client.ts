/**
 * Nanobase Client - 共通クライアント
 */

export interface NanobaseConfig {
  easyauthUrl?: string;
  pocketdataUrl?: string;
  noticoUrl?: string;
  monitorUrl?: string;
}

const DEFAULT_CONFIG: NanobaseConfig = {
  easyauthUrl: 'https://easyauth.nanobase.dev',
  pocketdataUrl: 'https://pocketdata.nanobase.dev',
  noticoUrl: 'https://notico.nanobase.dev',
  monitorUrl: 'https://monitor.nanobase.dev',
};

export class NanobaseClient {
  private apiKey: string;
  private config: NanobaseConfig;
  private token: string | null = null;

  auth: AuthClient;
  data: DataClient;
  notify: NotifyClient;
  monitor: MonitorClient;

  constructor(apiKey: string, config: Partial<NanobaseConfig> = {}) {
    this.apiKey = apiKey;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.auth = new AuthClient(this);
    this.data = new DataClient(this);
    this.notify = new NotifyClient(this);
    this.monitor = new MonitorClient(this);
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  async fetch<T>(baseUrl: string, path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || 'API error');
    }

    return result.data;
  }

  get urls() {
    return this.config;
  }
}

// Auth Client
class AuthClient {
  constructor(private client: NanobaseClient) {}

  async signup(email: string, password: string): Promise<{ token: string; user: { id: string; email: string } }> {
    const result = await this.client.fetch<{ token: string; user: { id: string; email: string } }>(
      this.client.urls.easyauthUrl!,
      '/api/v1/auth/signup-email',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    this.client.setToken(result.token);
    return result;
  }

  async login(email: string, password: string): Promise<{ token: string; user: { id: string; email: string } }> {
    const result = await this.client.fetch<{ token: string; user: { id: string; email: string } }>(
      this.client.urls.easyauthUrl!,
      '/api/v1/auth/login-email',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    this.client.setToken(result.token);
    return result;
  }

  async logout(): Promise<void> {
    await this.client.fetch(
      this.client.urls.easyauthUrl!,
      '/api/v1/auth/logout',
      { method: 'POST' }
    );
    this.client.setToken(null);
  }

  async me(): Promise<{ id: string; email: string }> {
    return this.client.fetch(
      this.client.urls.easyauthUrl!,
      '/api/v1/auth/me'
    );
  }
}

// Data Client
class DataClient {
  constructor(private client: NanobaseClient) {}

  async create<T>(collection: string, data: Omit<T, 'id'>): Promise<T> {
    return this.client.fetch<T>(
      this.client.urls.pocketdataUrl!,
      `/api/v1/data/${collection}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async find<T>(collection: string, query: { where?: Record<string, any>; orderBy?: Record<string, 'asc' | 'desc'>; limit?: number }): Promise<T[]> {
    const params = new URLSearchParams();
    if (query.where) params.set('where', JSON.stringify(query.where));
    if (query.orderBy) params.set('orderBy', JSON.stringify(query.orderBy));
    if (query.limit) params.set('limit', query.limit.toString());

    return this.client.fetch<T[]>(
      this.client.urls.pocketdataUrl!,
      `/api/v1/data/${collection}?${params}`
    );
  }

  async findOne<T>(collection: string, query: { where: Record<string, any> }): Promise<T | null> {
    const results = await this.find<T>(collection, { ...query, limit: 1 });
    return results[0] || null;
  }

  async update<T>(collection: string, id: string, data: Partial<T>): Promise<T> {
    return this.client.fetch<T>(
      this.client.urls.pocketdataUrl!,
      `/api/v1/data/${collection}/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.client.fetch(
      this.client.urls.pocketdataUrl!,
      `/api/v1/data/${collection}/${id}`,
      { method: 'DELETE' }
    );
  }
}

// Notify Client
class NotifyClient {
  constructor(private client: NanobaseClient) {}

  async send(options: {
    userId: string;
    type: 'email' | 'push' | 'sms';
    subject?: string;
    message: string;
    metadata?: Record<string, any>;
  }): Promise<{ id: string }> {
    return this.client.fetch(
      this.client.urls.noticoUrl!,
      '/api/v1/notifications/send',
      {
        method: 'POST',
        body: JSON.stringify(options),
      }
    );
  }

  async schedule(options: {
    userId: string;
    type: 'email' | 'push' | 'sms';
    subject?: string;
    message: string;
    scheduledAt: string;
    metadata?: Record<string, any>;
  }): Promise<{ id: string }> {
    return this.client.fetch(
      this.client.urls.noticoUrl!,
      '/api/v1/notifications/schedule',
      {
        method: 'POST',
        body: JSON.stringify(options),
      }
    );
  }
}

// Monitor Client
class MonitorClient {
  constructor(private client: NanobaseClient) {}

  async track(event: string, properties?: Record<string, any>): Promise<void> {
    await this.client.fetch(
      this.client.urls.monitorUrl!,
      '/api/v1/events',
      {
        method: 'POST',
        body: JSON.stringify({ event, properties }),
      }
    );
  }

  async error(error: Error, context?: Record<string, any>): Promise<void> {
    await this.client.fetch(
      this.client.urls.monitorUrl!,
      '/api/v1/errors',
      {
        method: 'POST',
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          context,
        }),
      }
    );
  }
}
