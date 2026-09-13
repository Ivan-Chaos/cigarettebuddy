import {
  SIGNALING_CLOSE_CODES,
  chatMessageSchema,
  type ChatMessage,
  type ClientMessage,
  type IceServer,
  type ReportReason,
  type ServerMessage,
} from '@cigbuddy/shared';
import { readLastRoom, writeLastRoom } from '$lib/storage';
import { nowIso } from './clock';
import { createPeer, type PeerHandle } from './peer';
import { SignalingClient, resolveSignalingUrl } from './signaling';

export type RoomStatus =
  | 'idle'
  | 'media'
  | 'connecting'
  | 'waiting'
  | 'negotiating'
  | 'connected'
  | 'full'
  | 'expired'
  | 'error';

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
  peerId = $state('');
  status = $state<RoomStatus>('idle');
  error = $state<string | null>(null);

  /** When the current cigarette burns out, on this browser's clock. Null until paired. */
  deadline = $state<number | null>(null);
  /** Cigarettes finished with this peer, i.e. how many times both lit another. */
  lit = $state(0);
  /** Peer ids that have voted to light another one this cigarette. */
  wantsAnother = $state<string[]>([]);
  iWantAnother = $derived(this.wantsAnother.includes(this.peerId));
  theyWantAnother = $derived(this.wantsAnother.some((id) => id !== this.peerId));

  localStream = $state.raw<MediaStream | null>(null);
  remoteStream = $state.raw<MediaStream | null>(null);
  connectionState = $state<RTCPeerConnectionState | 'none'>('none');

  micEnabled = $state(true);
  camEnabled = $state(true);
  mediaDenied = $state(false);

  /** Available inputs; labels are only populated once media permission exists. */
  audioInputs = $state.raw<MediaDeviceInfo[]>([]);
  videoInputs = $state.raw<MediaDeviceInfo[]>([]);
  audioDeviceId = $state('');
  videoDeviceId = $state('');

  chatReady = $state(false);
  messages = $state<ChatEntry[]>([]);

  private signaling: SignalingClient | null = null;
  private peer: PeerHandle | null = null;
  private chat: RTCDataChannel | null = null;
  private iceServers: IceServer[] = [];
  private destroyed = false;
  private readonly onDeviceChange = () => void this.refreshDevices();
  private watchingDevices = false;

  /** Joins a specific room by id. */
  async join(roomId: string): Promise<void> {
    this.roomId = roomId;
    await this.open({ type: 'join', roomId });
  }

  /**
   * Lets the server pick a room with a free seat (or open a fresh one), never
   * the room this browser was last in.
   */
  async joinRandom(): Promise<void> {
    this.roomId = '';
    await this.open({ type: 'join-random', avoidRoomId: readLastRoom() ?? undefined });
  }

  /** Drops the peer and socket but keeps the camera, then joins again. */
  async rejoin(): Promise<void> {
    this.leaveRoom();
    await (this.roomId ? this.join(this.roomId) : this.joinRandom());
  }

  /** Leaves whoever this is and finds somebody else. The camera stays on. */
  async next(): Promise<void> {
    this.leaveRoom();
    this.messages = [];
    await this.joinRandom();
  }

  /** Votes to reset the clock. The room relights once the other side votes too. */
  lightAnother(): void {
    if (this.status !== 'connected' || this.iWantAnother) return;
    this.signaling?.send({ type: 'light-another' });
  }

  /** Flags the other person, then leaves. Same socket, so the report goes first. */
  report(reason: ReportReason, note?: string): void {
    const trimmed = note?.trim();
    this.signaling?.send({ type: 'report', reason, ...(trimmed ? { note: trimmed } : {}) });
    this.destroy();
  }

  private async open(
    hello: Extract<ClientMessage, { type: 'join' | 'join-random' }>,
  ): Promise<void> {
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

    signaling.send(hello);
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

  /** Switches the microphone; the live call keeps going via `replaceTrack`. */
  selectAudioDevice(deviceId: string): Promise<void> {
    return this.switchInput('audio', deviceId);
  }

  /** Switches the camera; the live call keeps going via `replaceTrack`. */
  selectVideoDevice(deviceId: string): Promise<void> {
    return this.switchInput('video', deviceId);
  }

  /** Idempotent. Safe to call from beforeunload, onMount cleanup and leave. */
  destroy(): void {
    this.destroyed = true;
    this.leaveRoom();
    for (const track of this.localStream?.getTracks() ?? []) track.stop();
    this.localStream = null;
    this.status = 'idle';
    if (this.watchingDevices) {
      navigator.mediaDevices.removeEventListener('devicechange', this.onDeviceChange);
      this.watchingDevices = false;
    }
  }

  // ---- internals -----------------------------------------------------------

  private async acquireMedia(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.localStream = stream;
      this.mediaDenied = false;
      for (const track of stream.getAudioTracks()) track.enabled = this.micEnabled;
      for (const track of stream.getVideoTracks()) track.enabled = this.camEnabled;
      this.rememberSelection(stream);
    } catch {
      this.mediaDenied = true;
      this.system('Camera or microphone unavailable. You can still see your peer and chat.');
    }
    await this.refreshDevices();
  }

  /** Enumerates inputs and keeps the list fresh as devices are (un)plugged. */
  private async refreshDevices(): Promise<void> {
    if (!this.watchingDevices) {
      navigator.mediaDevices.addEventListener('devicechange', this.onDeviceChange);
      this.watchingDevices = true;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      // Without permission Chrome reports placeholder entries with empty ids.
      const usable = devices.filter((d) => d.deviceId !== '');
      this.audioInputs = usable.filter((d) => d.kind === 'audioinput');
      this.videoInputs = usable.filter((d) => d.kind === 'videoinput');
    } catch (err) {
      console.error('[rtc] enumerateDevices failed', err);
    }
  }

  private rememberSelection(stream: MediaStream): void {
    const audioId = stream.getAudioTracks()[0]?.getSettings().deviceId;
    const videoId = stream.getVideoTracks()[0]?.getSettings().deviceId;
    if (audioId) this.audioDeviceId = audioId;
    if (videoId) this.videoDeviceId = videoId;
  }

  private async switchInput(kind: 'audio' | 'video', deviceId: string): Promise<void> {
    const current = kind === 'audio' ? this.audioDeviceId : this.videoDeviceId;
    if (!deviceId || deviceId === current) return;

    let fresh: MediaStream;
    try {
      fresh = await navigator.mediaDevices.getUserMedia({
        [kind]: { deviceId: { exact: deviceId } },
      });
    } catch (err) {
      console.error(`[rtc] could not open ${kind} device`, err);
      this.system(`Could not switch ${kind === 'audio' ? 'microphone' : 'camera'}.`);
      return;
    }

    const track = fresh.getTracks()[0];
    if (!track || this.destroyed) {
      for (const t of fresh.getTracks()) t.stop();
      return;
    }
    track.enabled = kind === 'audio' ? this.micEnabled : this.camEnabled;

    const stream = this.localStream ?? new MediaStream();
    const old = kind === 'audio' ? stream.getAudioTracks() : stream.getVideoTracks();
    for (const t of old) {
      t.stop();
      stream.removeTrack(t);
    }
    stream.addTrack(track);

    // Swap the track on the live connection without renegotiating when we can.
    const pc = this.peer?.pc;
    if (pc) {
      const sender = pc.getSenders().find((s) => s.track?.kind === kind || old.includes(s.track!));
      if (sender) {
        try {
          await sender.replaceTrack(track);
        } catch (err) {
          console.error('[rtc] replaceTrack failed', err);
        }
      } else {
        pc.addTrack(track, stream);
      }
    }

    // Reassign so `$state.raw` consumers notice, even when it is the same object.
    this.localStream = stream;
    this.mediaDenied = false;
    if (kind === 'audio') this.audioDeviceId = deviceId;
    else this.videoDeviceId = deviceId;
    await this.refreshDevices();
  }

  private async onServerMessage(message: ServerMessage): Promise<void> {
    switch (message.type) {
      case 'joined':
        this.roomId = message.roomId;
        this.peerId = message.peerId;
        this.iceServers = message.iceServers;
        // Remembered straight away, so even a crash cannot match us back here.
        writeLastRoom(message.roomId);
        this.clearBurn();
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
        this.clearBurn();
        this.status = 'waiting';
        return;

      case 'timer': {
        const prevLit = this.lit;
        const prevThey = this.theyWantAnother;
        // Local deadline from the remaining time, so clock skew never matters.
        this.deadline = Date.now() + message.remainingMs;
        this.lit = message.lit;
        this.wantsAnother = message.wantsAnother;
        if (message.lit > prevLit) this.system('Lit another one.');
        else if (this.theyWantAnother && !prevThey) this.system('They want another one.');
        return;
      }

      case 'expired':
        this.system("That's the break.");
        this.leaveRoom();
        this.status = 'expired';
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
    // Normally the `expired` frame got here first; this is the fallback.
    if (code === SIGNALING_CLOSE_CODES.expired || this.status === 'expired') {
      if (this.status !== 'expired') {
        this.leaveRoom();
        this.status = 'expired';
      }
      return;
    }
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

  /** Every way out of a room goes through here: destroy, rejoin, next, expiry. */
  private leaveRoom(): void {
    if (this.roomId) writeLastRoom(this.roomId);
    this.clearBurn();
    this.teardownPeer();
    const signaling = this.signaling;
    this.signaling = null;
    if (signaling) {
      signaling.send({ type: 'leave' });
      signaling.close();
    }
  }

  private clearBurn(): void {
    this.deadline = null;
    this.lit = 0;
    this.wantsAnother = [];
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
