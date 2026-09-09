import {
  CHAT_CHANNEL_LABEL,
  type ClientMessage,
  type IceServer,
  type ServerMessage,
  type SessionDescription,
} from '@cigbuddy/shared';

export interface PeerOptions {
  iceServers: IceServer[];
  /** The polite peer rolls back on glare; the impolite peer initiates. */
  polite: boolean;
  localStream: MediaStream | null;
  send: (message: ClientMessage) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onDataChannel: (channel: RTCDataChannel) => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
}

export interface PeerHandle {
  readonly pc: RTCPeerConnection;
  handle(message: ServerMessage): Promise<void>;
  close(): void;
}

/**
 * One RTCPeerConnection driven by the "perfect negotiation" pattern from the
 * WebRTC spec, so both sides can call addTrack up front and glare resolves
 * itself. Framework-free: the reactive layer lives in room.svelte.ts.
 */
export function createPeer(options: PeerOptions): PeerHandle {
  const { polite, send } = options;
  const pc = new RTCPeerConnection({ iceServers: options.iceServers });

  let makingOffer = false;
  let ignoreOffer = false;
  let isSettingRemoteAnswerPending = false;
  let closed = false;

  const remoteStream = new MediaStream();
  let remoteAnnounced = false;

  if (options.localStream) {
    for (const track of options.localStream.getTracks()) {
      pc.addTrack(track, options.localStream);
    }
  } else {
    // No camera/mic: still receive the peer's media in one negotiation round.
    pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.addTransceiver('video', { direction: 'recvonly' });
  }

  // The initiator owns the chat channel; the other side receives it.
  if (!polite) {
    options.onDataChannel(pc.createDataChannel(CHAT_CHANNEL_LABEL));
  }
  pc.ondatachannel = (event) => options.onDataChannel(event.channel);

  pc.ontrack = (event) => {
    remoteStream.addTrack(event.track);
    if (!remoteAnnounced) {
      remoteAnnounced = true;
      options.onRemoteStream(remoteStream);
    }
  };

  pc.onicecandidate = ({ candidate }) => {
    if (!candidate) return;
    send({
      type: 'ice-candidate',
      candidate: {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
        usernameFragment: candidate.usernameFragment,
      },
    });
  };

  pc.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      await pc.setLocalDescription();
      send({ type: 'offer', description: describe(pc.localDescription) });
    } catch (err) {
      console.error('[rtc] negotiation failed', err);
    } finally {
      makingOffer = false;
    }
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'failed') pc.restartIce();
  };

  pc.onconnectionstatechange = () => options.onConnectionState(pc.connectionState);

  async function handle(message: ServerMessage): Promise<void> {
    if (closed) return;

    if (message.type === 'offer' || message.type === 'answer') {
      const description = message.description;
      const readyForOffer =
        !makingOffer && (pc.signalingState === 'stable' || isSettingRemoteAnswerPending);
      const offerCollision = description.type === 'offer' && !readyForOffer;

      ignoreOffer = !polite && offerCollision;
      if (ignoreOffer) return;

      isSettingRemoteAnswerPending = description.type === 'answer';
      // For the polite peer this implicitly rolls back its own pending offer.
      await pc.setRemoteDescription(description);
      isSettingRemoteAnswerPending = false;

      if (description.type === 'offer') {
        await pc.setLocalDescription();
        send({ type: 'answer', description: describe(pc.localDescription) });
      }
      return;
    }

    if (message.type === 'ice-candidate') {
      if (!message.candidate) return;
      try {
        await pc.addIceCandidate(message.candidate);
      } catch (err) {
        // Candidates for an offer we deliberately ignored are expected to fail.
        if (!ignoreOffer) throw err;
      }
    }
  }

  function close() {
    if (closed) return;
    closed = true;
    pc.ondatachannel = null;
    pc.ontrack = null;
    pc.onicecandidate = null;
    pc.onnegotiationneeded = null;
    pc.oniceconnectionstatechange = null;
    pc.onconnectionstatechange = null;
    pc.close();
  }

  return { pc, handle, close };
}

function describe(description: RTCSessionDescription | null): SessionDescription {
  if (!description || (description.type !== 'offer' && description.type !== 'answer')) {
    throw new Error(`Unexpected local description: ${description?.type ?? 'none'}`);
  }
  return { type: description.type, sdp: description.sdp };
}
