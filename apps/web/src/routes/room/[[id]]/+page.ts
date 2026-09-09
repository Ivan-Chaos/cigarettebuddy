import { error } from '@sveltejs/kit';
import { roomIdSchema } from '@cigbuddy/shared';
import type { PageLoad } from './$types';

// Everything on this page needs the browser (camera, RTCPeerConnection), so
// skip server rendering rather than guard every access.
export const ssr = false;

/** `/room` asks the server for a random room; `/room/<id>` joins that room. */
export const load: PageLoad = ({ params }) => {
  if (params.id === undefined) return { roomId: null };

  const parsed = roomIdSchema.safeParse(params.id);
  if (!parsed.success) error(404, 'Invalid room id');
  return { roomId: parsed.data };
};
