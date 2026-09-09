import { randomSlogan } from '$lib/slogans';
import type { LayoutServerLoad } from './$types';

/**
 * Picks the header slogan once per visit.
 *
 * This is deliberately a *server* load. A universal load (`+layout.ts`) runs on
 * the server for SSR and then again in the browser during hydration, so
 * `Math.random()` is called twice and the slogan visibly swaps a moment after
 * the page appears. A server load runs once and its result is serialised, so
 * the browser reuses the value it was rendered with.
 *
 * It touches no `params`, no `url` and no `depends()`, so SvelteKit reuses the
 * value across client-side navigation: the slogan holds for the visit and
 * re-rolls on a full page load.
 */
export const load: LayoutServerLoad = () => ({ slogan: randomSlogan() });
