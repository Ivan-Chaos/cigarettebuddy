import { read } from '$app/server';
import type { RequestHandler } from './$types';
import ico from '$lib/assets/favicon.ico';

/*
 * Serves /favicon.ico with a real Content-Type.
 *
 * The file would normally just sit in static/, but adapter-node's static
 * handler (sirv, via mrmime 2) has no entry for .ico and sends it with an
 * empty Content-Type. Browsers sniff their way past that; Google's favicon
 * crawler is less forgiving. So the file lives in $lib/assets and is served
 * from here instead. Not prerendered on purpose: a prerendered copy would land
 * back in the static output and lose the header again.
 */
export const GET: RequestHandler = () =>
  new Response(read(ico).body, {
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=86400',
    },
  });
