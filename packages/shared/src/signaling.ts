import { z } from 'zod';
import { reportNoteSchema, reportReasonSchema } from './report.js';
import { topicSchema } from './topic.js';

/**
 * Wire contract for the 1:1 video rooms. The signaling WebSocket only relays
 * SDP and ICE candidates between the two peers, so those payloads are kept
 * opaque here; the server never inspects them.
 */

/** Lowercase letters, digits and dashes, 4–32 chars, no leading/trailing dash. */
export const roomIdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{2,30}[a-z0-9]$/, 'Room id must be 4–32 chars of a-z, 0-9 or -');

export type RoomId = z.infer<typeof roomIdSchema>;

/**
 * One cigarette. A pairing gets this long from the moment the room fills;
 * both peers voting `light-another` resets it. The server owns the clock and
 * sends the remaining time, so the clients never compare wall clocks.
 */
export const CHAT_DURATION_MS = 10 * 60 * 1000;

/**
 * Minimum gap between topic changes in one room. The cooldown belongs to the
 * room, not to the peer: whoever changed the subject last, nobody changes it
 * again for this long. Clients disable their own button for the same stretch
 * whenever a `topic` frame lands, so a refused request needs no reply.
 */
export const TOPIC_COOLDOWN_MS = 3_000;

/** Structurally compatible with the DOM `RTCIceServer` type. */
export const iceServerSchema = z.object({
  urls: z.union([z.string(), z.array(z.string())]),
  username: z.string().optional(),
  credential: z.string().optional(),
});

export type IceServer = z.infer<typeof iceServerSchema>;

const sessionDescriptionSchema = z.object({
  type: z.enum(['offer', 'answer']),
  sdp: z.string(),
});

const iceCandidateSchema = z
  .object({
    candidate: z.string(),
    sdpMid: z.string().nullable().optional(),
    sdpMLineIndex: z.number().nullable().optional(),
    usernameFragment: z.string().nullable().optional(),
  })
  .nullable();

export type SessionDescription = z.infer<typeof sessionDescriptionSchema>;
export type IceCandidate = z.infer<typeof iceCandidateSchema>;

// ---- client → server --------------------------------------------------------

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('join'), roomId: roomIdSchema }),
  /** Join any room with a free seat, or a fresh one; the server picks the id.
   *  `avoidRoomId` is the room this browser just left, so "next" never lands
   *  straight back in it. */
  z.object({ type: z.literal('join-random'), avoidRoomId: roomIdSchema.optional() }),
  z.object({ type: z.literal('offer'), description: sessionDescriptionSchema }),
  z.object({ type: z.literal('answer'), description: sessionDescriptionSchema }),
  z.object({ type: z.literal('ice-candidate'), candidate: iceCandidateSchema }),
  z.object({ type: z.literal('leave') }),
  /** Vote to reset the clock. The room relights once both peers have voted. */
  z.object({ type: z.literal('light-another') }),
  /** Ask for a different conversation topic. `afterId` is the topic the asker
   *  has on screen; when it no longer matches the room's, the request is a
   *  reaction to something already gone and is dropped, so two people clicking
   *  at once get one change rather than two. */
  z.object({ type: z.literal('next-topic'), afterId: z.string().max(32).optional() }),
  /** Flag the other peer. Stored server-side; no frame comes back. */
  z.object({
    type: z.literal('report'),
    reason: reportReasonSchema,
    note: reportNoteSchema.optional(),
  }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

// ---- server → client --------------------------------------------------------

export const signalingErrorCodeSchema = z.enum([
  'invalid_message',
  'invalid_room',
  'room_full',
  'already_joined',
  'not_in_room',
  'no_peer',
]);

export type SignalingErrorCode = z.infer<typeof signalingErrorCodeSchema>;

export const serverMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('joined'),
    peerId: z.string(),
    roomId: roomIdSchema,
    /** The peer already in the room is polite; the newcomer initiates. */
    polite: z.boolean(),
    peerPresent: z.boolean(),
    iceServers: z.array(iceServerSchema),
  }),
  z.object({ type: z.literal('peer-joined'), peerId: z.string() }),
  z.object({ type: z.literal('peer-left'), peerId: z.string() }),
  /** Full clock state for the room, sent to both peers whenever it changes. */
  z.object({
    type: z.literal('timer'),
    remainingMs: z.number().int().nonnegative(),
    /** Cigarettes finished in this pairing, i.e. how many relights so far. */
    lit: z.number().int().nonnegative(),
    /** Peer ids that have voted to light another one this cigarette. */
    wantsAnother: z.array(z.string()).max(2),
  }),
  /** The room's conversation topic, sent to everyone in it whenever it changes.
   *  `from` is the peer who asked for it, or null when the server rolled it by
   *  itself: a new room, the room filling, or a relight. */
  z.object({ type: z.literal('topic'), topic: topicSchema, from: z.string().nullable() }),
  /** The clock ran out. The server closes the socket right after. */
  z.object({ type: z.literal('expired') }),
  z.object({ type: z.literal('offer'), from: z.string(), description: sessionDescriptionSchema }),
  z.object({ type: z.literal('answer'), from: z.string(), description: sessionDescriptionSchema }),
  z.object({ type: z.literal('ice-candidate'), from: z.string(), candidate: iceCandidateSchema }),
  z.object({ type: z.literal('error'), code: signalingErrorCodeSchema, message: z.string() }),
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;
/** The `timer` payload without its tag; what `RoomManager` computes. */
export type TimerState = Omit<Extract<ServerMessage, { type: 'timer' }>, 'type'>;

/** WebSocket close codes the server uses when it hangs up on a client. */
export const SIGNALING_CLOSE_CODES = {
  roomFull: 4001,
  invalidRoom: 4002,
  invalidMessage: 4003,
  expired: 4004,
} as const;

// ---- peer → peer (RTCDataChannel "chat") ------------------------------------

export const CHAT_CHANNEL_LABEL = 'chat';

export const chatMessageSchema = z.object({
  type: z.literal('chat'),
  id: z.string(),
  text: z.string().min(1).max(2000),
  sentAt: z.iso.datetime(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
