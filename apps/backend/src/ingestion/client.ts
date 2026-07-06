import { getEnv } from '../config/env.js';
import { getLogger } from '../lib/logger.js';
import type { TxLINEAuthResponse, TxLINESubscribeResponse, TxLINEFixture, TxLINEFixtureOdds, TxLINEHistoricalQuery } from './types.js';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method: HttpMethod;
  path: string;
  body?: unknown;
  token?: string;
  apiToken?: string;
  retries?: number;
}

const MAX_RETRIES = 5;
const BASE_DELAY = 1000;

export class TxLINEClient {
  private baseUrl: string;
  private guestToken: string | null = null;
  private apiToken: string | null = null;
  private subscriptionId: string | null = null;
  private connected = false;

  constructor() {
    this.baseUrl = getEnv().TXLINE_API_BASE;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async authenticate(): Promise<void> {
    const log = getLogger();
    log.info('Authenticating with TxLINE (guest JWT flow)');

    const auth = await this.request<TxLINEAuthResponse>({
      method: 'POST',
      path: '/auth/guest',
      body: { client_id: getEnv().TXLINE_CLIENT_ID },
    });
    this.guestToken = auth.token;
    log.info('Guest JWT obtained');
  }

  async subscribe(): Promise<void> {
    if (!this.guestToken) await this.authenticate();
    const log = getLogger();

    log.info('Subscribing to TxLINE odds stream');
    const sub = await this.request<TxLINESubscribeResponse>({
      method: 'POST',
      path: '/subscribe',
      body: { wallet_key: getEnv().TXLINE_WALLET_KEY },
      token: this.guestToken!,
    });

    this.subscriptionId = sub.subscription_id;
    this.apiToken = sub.api_token;
    this.connected = true;
    log.info({ subscriptionId: this.subscriptionId }, 'TxLINE subscription active');
  }

  async getFixtures(): Promise<TxLINEFixture[]> {
    return this.request<TxLINEFixture[]>({
      method: 'GET',
      path: '/fixtures',
      apiToken: this.apiToken ?? undefined,
    });
  }

  async getFixtureOdds(fixtureId: string): Promise<TxLINEFixtureOdds> {
    return this.request<TxLINEFixtureOdds>({
      method: 'GET',
      path: `/fixtures/${fixtureId}/odds`,
      apiToken: this.apiToken ?? undefined,
    });
  }

  async getHistoricalOdds(query: TxLINEHistoricalQuery): Promise<TxLINEFixtureOdds> {
    const params = new URLSearchParams();
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    const qs = params.toString();
    return this.request<TxLINEFixtureOdds>({
      method: 'GET',
      path: `/fixtures/${query.fixture_id}/odds/historical${qs ? `?${qs}` : ''}`,
      apiToken: this.apiToken ?? undefined,
    });
  }

  async getValidationProof(fixtureId: string): Promise<{ proof_ref: string; tx_hash: string }> {
    return this.request<{ proof_ref: string; tx_hash: string }>({
      method: 'GET',
      path: `/fixtures/${fixtureId}/proof`,
      apiToken: this.apiToken ?? undefined,
    });
  }

  private async request<T>(opts: RequestOptions): Promise<T> {
    const { method, path, body, retries = MAX_RETRIES } = opts;
    const url = `${this.baseUrl}${path}`;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
        if (opts.apiToken) headers['X-API-Token'] = opts.apiToken;

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TxLINE API ${response.status}: ${errorText}`);
        }

        return response.json() as Promise<T>;
      } catch (err) {
        if (attempt === retries) throw err;
        const delay = BASE_DELAY * Math.pow(2, attempt) + Math.random() * 500;
        getLogger().warn({ err, attempt, maxRetries: retries, delay }, 'TxLINE request failed, retrying');
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error('Unreachable');
  }
}
