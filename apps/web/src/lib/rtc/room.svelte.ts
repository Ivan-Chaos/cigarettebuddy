import {
  SIGNALING_CLOSE_CODES,
  chatMessageSchema,
  type ChatMessage,
  type IceServer,
  type ServerMessage,
} from '@cigbuddy/shared';
import { nowIso } from './clock';
import { createPeer, type PeerHandle } from './peer';
import { SignalingClient, resolveSignalingUrl } from './signaling';

export type RoomStatus =
  'idle' | 'media' | 'connecting' | 'waiting' | 'negotiating' | 'connected' | 'full' | 'error';

export interface ChatEntry {
  id: string;
  kind: 'chat' | 'system';
  text: string;
  at: string;
  mine?: boolean;
}

/**
 * Reactive state for one visit to a room. Browser objects (streams, peer
 * connection, sockets) are kept out of deep reactivity on purpose.
 */
export class RoomSession {
  roomId = $state('');
  status = $state<RoomStatus>('idle');
  error = $state<string | null>(null);

  localStream = $state.raw<MediaStream | null>(null);
  remoteStream = $state.raw<MediaStream | null>(null);
  connectionState = $state<RTCPeerConnectionState | 'none'>('none');

  micEnabled = $state(true);
  camEnabled = $state(true);
  mediaDenied = $state(false);

  chatReady = $state(false);
  messages = $state<ChatEntry[]>([]);

  private signaling: SignalingClient | null = null;
  private peer: PeerHandle | null = null;
  private chat: RTCDataChannel | null = null;
  private iceServers: IceServer[] = [];
  private destroyed = false;

  async join(roomId: string): Promise<void> {
    this.roomId = roomId;
    this.destroyed = false;
    this.error = null;

    if (!this.localStream && !this.mediaDenied) {
      this.status = 'media';
      await this.acquireMedia();
      if (this.destroyed) return;
    }

    this.status = 'connecting';
    const signaling = new SignalingClient();
    this.signaling = signaling;
    signaling.onMessage((message) => void this.onServerMessage(message));
    signaling.onClose((code) => this.onSignalingClosed(signaling, code));

    try {
      await signaling.connect(resolveSignalingUrl());
    } catch (err) {
      this.fail(err instanceof Error ? err.message : 'Could not reach the signaling server');
      return;
    }

    if (this.destroyed) {
      signaling.close();
      return;
    }

    signaling.send({ type: 'join', roomId });
  }

  /** Drops the peer and socket but keeps the camera, then joins again. */
  async rejoin(): Promise<void> {
    this.leaveRoom();
    await this.join(this.roomId);
  }

  sendChat(text: string): void {
    const trimmed = text.trim();
    if (!trimmed || !this.chat || this.chat.readyState !== 'open') return;

    const message: ChatMessage = {
      type: 'chat',
      id: crypto.randomUUID(),
      text: trimmed,
      sentAt: nowIso(),
    };
    this.chat.send(JSON.stringify(message));
    this.messages.push({
      id: message.id,
      kind: 'chat',
      text: message.text,
      at: message.sentAt,
      mine: true,
    });
  }

  toggleMic(): void {
    this.micEnabled = !this.micEnabled;
    for (const track of this.localStream?.getAudioTracks() ?? []) track.enabled = this.micEnabled;
  }

  toggleCam(): void {
    this.camEnabled = !this.camEnabled;
    for (const track of this.localStream?.getVideoTracks() ?? []) track.enabled = this.camEnabled;
  }

  hangUp(): void {
    this.destroy();
  }

  /** Idempotent. Safe to call from beforeunload, onMount cleanup and hangUp. */
  destroy(): void {
    this.destroyed = true;
    this.leaveRoom();
    for (const track of this.localStream?.getTracks() ?? []) track.stop();
    this.localStream = null;
    this.status = 'idle';
  }

  // ---- internals -----------------------------------------------------------

  private async acquireMedia(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.localStream = stream;
      this.mediaDenied = false;
      for (const track of stream.getAudioTracks()) track.enabled = this.micEnabled;
      for (const track of stream.getVideoTracks()) track.enabled = this.camEnabled;
    } catch {
      this.mediaDenied = true;
      this.system('Camera or microphone unavailable. You can still see your peer and chat.');
    }
  }

  private async onServerMessage(message: ServerMessage): Promise<void> {
    switch (message.type) {
      case 'joined':
        this.iceServers = message.iceServers;
        if (message.peerPresent) {
          this.startPeer(false);
        } else {
          this.status = 'waiting';
        }
        return;

      case 'peer-joined':
        this.system('Your peer joined.');
        this.startPeer(true);
        return;

      case 'peer-left':
        this.system('Your peer left.');
        this.teardownPeer();
        this.status = 'waiting';
        return;

      case 'offer':
      case 'answer':
      case 'ice-candidate':
        try {
          await this.peer?.handle(message);
        } catch (err) {
          console.error('[rtc] signaling message failed', err);
        }
        return;

      case 'error':
        if (message.code === 'room_full') {
          this.teardownPeer();
          this.status = 'full';
        } else if (message.code !== 'no_peer') {
          this.fail(message.message);
        }
        return;
    }
  }

  private onSignalingClosed(client: SignalingClient, code: number): void {
    if (client !== this.signaling || this.destroyed) return;
    if (code === SIGNALING_CLOSE_CODES.roomFull || this.status === 'full') return;
    this.teardownPeer();
    this.fail('Connection to the server was lost.');
  }

  private startPeer(polite: boolean): void {
    this.teardownPeer();
    const signaling = this.signaling;
    if (!signaling) return;

    this.status = 'negotiating';
    this.peer = createPeer({
      iceServers: this.iceServers,
      polite,
      localStream: this.localStream,
      send: (message) => signaling.send(message),
      onRemoteStream: (stream) => {
        this.remoteStream = stream;
      },
      onDataChannel: (channel) => this.attachChat(channel),
      onConnectionState: (state) => {
        this.connectionState = state;
        if (state === 'connected') this.status = 'connected';
        else if (state === 'failed' || state === 'disconnected') this.status = 'negotiating';
      },
    });
  }

  private teardownPeer(): void {
    this.chat?.close();
    this.chat = null;
    this.chatReady = false;
    this.peer?.close();
    this.peer = null;
    this.remoteStream = null;
    this.connectionState = 'none';
  }

  private leaveRoom(): void {
    this.teardownPeer();
    const signaling = this.signaling;
    this.signaling = null;
    if (signaling) {
      signaling.send({ type: 'leave' });
      signaling.close();
    }
  }

  private attachChat(channel: RTCDataChannel): void {
    this.chat = channel;
    channel.onopen = () => {
      this.chatReady = true;
    };
    channel.onclose = () => {
      if (this.chat === channel) this.chatReady = false;
    };
    channel.onmessage = (event) => {
      let json: unknown;
      try {
        json = JSON.parse(String(event.data));
      } catch {
        return;
      }
      const parsed = chatMessageSchema.safeParse(json);
      if (!parsed.success) return;
      this.messages.push({
        id: parsed.data.id,
        kind: 'chat',
        text: parsed.data.text,
        at: parsed.data.sentAt,
        mine: false,
      });
    };
  }

  private system(text: string): void {
    this.messages.push({
      id: crypto.randomUUID(),
      kind: 'system',
      text,
      at: nowIso(),
    });
  }

  private fail(message: string): void {
    this.error = message;
    this.status = 'error';
  }
}
