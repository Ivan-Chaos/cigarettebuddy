import { z } from 'zod';

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
  /** Join any room with a free seat, or a fresh one; the server picks the id. */
  z.object({ type: z.literal('join-random') }),
  z.object({ type: z.literal('offer'), description: sessionDescriptionSchema }),
  z.object({ type: z.literal('answer'), description: sessionDescriptionSchema }),
  z.object({ type: z.literal('ice-candidate'), candidate: iceCandidateSchema }),
  z.object({ type: z.literal('leave') }),
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
  z.object({ type: z.literal('offer'), from: z.string(), description: sessionDescriptionSchema }),
  z.object({ type: z.literal('answer'), from: z.string(), description: sessionDescriptionSchema }),
  z.object({ type: z.literal('ice-candidate'), from: z.string(), candidate: iceCandidateSchema }),
  z.object({ type: z.literal('error'), code: signalingErrorCodeSchema, message: z.string() }),
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;

/** WebSocket close codes the server uses when it hangs up on a client. */
export const SIGNALING_CLOSE_CODES = {
  roomFull: 4001,
  invalidRoom: 4002,
  invalidMessage: 4003,
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
