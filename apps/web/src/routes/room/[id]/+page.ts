import { error } from '@sveltejs/kit';
import { roomIdSchema } from '@cigbuddy/shared';
import type { PageLoad } from './$types';

// Everything on this page needs the browser (camera, RTCPeerConnection), so
// skip server rendering rather than guard every access.
export const ssr = false;

export const load: PageLoad = ({ params }) => {
  const parsed = roomIdSchema.safeParse(params.id);
  if (!parsed.success) error(404, 'Invalid room id');
  return { roomId: parsed.data };
};
