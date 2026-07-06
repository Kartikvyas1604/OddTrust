import WebSocket from 'ws';
import { getEnv } from '../config/env.js';
import { getLogger } from '../lib/logger.js';
import type { TxLINEStreamMessage } from './types.js';

export type StreamHandler = (msg: TxLINEStreamMessage) => void;

export class TxLINEStream {
  private ws: WebSocket | null = null;
  private apiToken: string;
  private handlers: Set<StreamHandler> = new Set();
  private shouldReconnect = true;
  private reconnectAttempt = 0;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private lastPong = Date.now();

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  onMessage(handler: StreamHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async connect(): Promise<void> {
    const log = getLogger();
    const url = `${getEnv().TXLINE_WS_URL}?token=${this.apiToken}`;

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.on('open', () => {
        log.info('TxLINE WebSocket connected');
        this.reconnectAttempt = 0;
        this.lastPong = Date.now();

        this.pingInterval = setInterval(() => {
          if (Date.now() - this.lastPong > 30000) {
            log.warn('No pong from TxLINE in 30s, reconnecting');
            this.ws?.terminate();
            return;
          }
          ws.ping();
        }, 15000);

        resolve();
      });

      ws.on('message', (raw) => {
        try {
          const msg: TxLINEStreamMessage = JSON.parse(raw.toString());
          if (msg.type === 'heartbeat') return;
          for (const handler of this.handlers) {
            try {
              handler(msg);
            } catch (err) {
              log.error({ err }, 'Stream handler error');
            }
          }
        } catch (err) {
          log.warn({ err, raw: raw.toString().slice(0, 200) }, 'Failed to parse stream message');
        }
      });

      ws.on('pong', () => {
        this.lastPong = Date.now();
      });

      ws.on('close', (code, reason) => {
        log.warn({ code, reason: reason.toString() }, 'TxLINE WebSocket closed');
        this.cleanup();
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      });

      ws.on('error', (err) => {
        log.error({ err }, 'TxLINE WebSocket error');
        ws.close();
      });
    });
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 30000);
    this.reconnectAttempt++;
    getLogger().info({ attempt: this.reconnectAttempt, delay }, 'TxLINE WebSocket reconnecting');
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect().catch((err) => {
          getLogger().error({ err }, 'TxLINE WebSocket reconnect failed');
        });
      }
    }, delay);
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.cleanup();
    this.ws?.close();
    this.ws = null;
  }
}
