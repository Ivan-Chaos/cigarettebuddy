import { env } from '$env/dynamic/public';
import { serverMessageSchema, type ClientMessage, type ServerMessage } from '@cigbuddy/shared';

/**
 * `PUBLIC_SIGNALING_URL` when set; otherwise the same host the page came from.
 * In development the Vite proxy forwards `/api/ws` to the API, in production a
 * reverse proxy is expected to do the same (or the variable points straight at
 * the API, as docker-compose does).
 */
export function resolveSignalingUrl(): string {
  const configured = env.PUBLIC_SIGNALING_URL?.trim();
  if (configured) return configured;

  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${location.host}/api/ws`;
}

type MessageListener = (message: ServerMessage) => void;
type CloseListener = (code: number, reason: string) => void;

/** Thin, validating wrapper around the signaling WebSocket. No reconnects. */
export class SignalingClient {
  private ws: WebSocket | null = null;
  private opened = false;
  private readonly messageListeners = new Set<MessageListener>();
  private readonly closeListeners = new Set<CloseListener>();

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.opened = true;
        resolve();
      };

      ws.onerror = () => {
        if (!this.opened) reject(new Error('Could not reach the signaling server'));
      };

      ws.onmessage = (event) => {
        let json: unknown;
        try {
          json = JSON.parse(String(event.data));
        } catch {
          return;
        }
        const parsed = serverMessageSchema.safeParse(json);
        if (!parsed.success) return;
        for (const listener of this.messageListeners) listener(parsed.data);
      };

      ws.onclose = (event) => {
        if (!this.opened) return;
        for (const listener of this.closeListeners) listener(event.code, event.reason);
      };
    });
  }

  send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onClose(listener: CloseListener): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  /** Closes quietly: listeners are dropped so a deliberate close is not an error. */
  close(): void {
    this.messageListeners.clear();
    this.closeListeners.clear();
    const ws = this.ws;
    this.ws = null;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close(1000, 'client closed');
    }
  }
}
