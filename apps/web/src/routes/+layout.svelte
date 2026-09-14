<script lang="ts">
  import '../app.css';
  import { env } from '$env/dynamic/public';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import AgeGate from '$lib/components/AgeGate.svelte';
  import { Badge88x31, Button, NavBar, SiteShell, type NavItem } from '$lib/components/retro';
  import type { LayoutProps } from './$types';

  let { children, data }: LayoutProps = $props();

  const inRoom = $derived(page.url.pathname.startsWith('/room'));

  const appName = env.PUBLIC_APP_NAME ?? 'CigaretteBuddy';
  const title = `${appName} | a smoke break with a stranger`;
  // "18+" is stated here on purpose: it is the one line Google is most likely
  // to quote, and it has to be unambiguous about who the site is for.
  const description = `${appName}: video chat with one random stranger who is also outside on a smoke break. Adults 18+ only. No account, nothing saved, two people to a room.`;
  // `page.url.origin` is the ORIGIN adapter-node is started with in production,
  // so this is the public https URL rather than the proxied 127.0.0.1 one.
  const canonical = $derived(`${page.url.origin}${page.url.pathname}`);
  const schema = $derived({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: appName,
    url: page.url.origin,
    description,
    publisher: {
      '@type': 'Organization',
      name: appName,
      url: page.url.origin,
      logo: `${page.url.origin}/icon-512.png`,
    },
  });
  // Built as a string because a literal <script> tag in the template trips
  // both the Svelte parser and eslint. The closing tag is split for the same
  // reason, and "<" is escaped so nothing in the JSON can close the tag early.
  const schemaTag = $derived(
    `<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}<` +
      '/script>',
  );

  /* The landing page composes its own full-bleed bands, so it opts out of the
     bordered sheet and supplies one itself for the sections not yet converted.
     Keyed off the route rather than the path, and gated on `page.error`: when
     the root page's load throws, SvelteKit renders +error.svelte into these
     same children with the pathname still `/`, and an unframed error page is
     an unpadded Notice bleeding to the viewport edge. */
  const isLanding = $derived(page.route.id === '/' && !page.error);

  // Route-aware so the in-page anchors never show up on a page that has no
  // such sections. Every link here points at something that exists -- which is
  // why this reuses `isLanding` rather than testing the path: an error on `/`
  // renders none of these sections.
  const nav = $derived<NavItem[]>(
    isLanding
      ? [
          { href: '#what', label: 'what this is' },
          { href: '#how', label: 'how it works' },
          { href: '#rules', label: 'house rules' },
          { href: '#faq', label: 'faq' },
        ]
      : [
          { href: resolve('/'), label: 'home' },
          { href: resolve('/room'), label: 'light up' },
        ],
  );
</script>

<svelte:head>
  <title>{title}</title>
  <!-- Names the brand and the subject outright. The previous description
       mentioned neither cigarettes nor smoking, so Google judged it a poor
       match for brand searches and stitched its own snippet out of page text
       (header button, hero, and a clipped line from the 18+ gate). -->
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />
  <meta name="theme-color" content="#f2eada" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content={appName} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonical} />
  <meta property="og:image" content="{page.url.origin}/icon-512.png" />
  <meta property="og:image:width" content="512" />
  <meta property="og:image:height" content="512" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content="{page.url.origin}/icon-512.png" />

  <!-- Tells Google which image is the brand's logo. It is separate from the
       favicon (which comes from the <link rel="icon"> tags in app.html), but
       it is what brand-name results and knowledge panels draw on. -->
  <!-- Safe: the JSON is built from our own constants and the request origin,
       with "<" escaped above. -->
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html schemaTag}
</svelte:head>

<SiteShell wide={inRoom} framed={!isLanding}>
  {#snippet header()}
    <div class="flex min-w-0 flex-col gap-0.5">
      <a href={resolve('/')} class="rt-logotype flex items-center gap-2 text-paper">
        <span class="truncate">
          CigaretteBuddy<span class="text-ash">.com</span>
        </span>
        <!-- Mirrored so the lit end points away from the wordmark rather than
             into it. -->
        <img
          src="/assets/cigarettes-png-22.png"
          alt=""
          aria-hidden="true"
          width="44"
          height="44"
          class="h-[1.45em] w-auto flex-none scale-x-[-1]"
        />
      </a>
      <p class="rt-mono text-[0.75rem] text-ash">{data.slogan}</p>
    </div>
    <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
      <NavBar items={nav} current={inRoom ? resolve('/room') : ''} tone="paper" />
      <!-- Flat on purpose: no offset shadow and no press travel, so it reads
           as a plain block rather than the kit's raised buttons. Its ink border
           disappears into the bar, which is what keeps it borderless. -->
      <Button variant="ember" href={resolve('/room')} class="shadow-none active:transform-none">
        Find a Buddy
      </Button>
    </div>
  {/snippet}

  {@render children?.()}

  {#snippet footer()}
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="text-sm">
        <p>cigarettebuddy is two boxes and a stranger.</p>
        <p class="text-ink-soft">no cookies, no accounts, no analytics, no idea who you'll get.</p>
      </div>
      <div class="rt-badgewall">
        <Badge88x31 title="No cookies" label="NO" sublabel="COOKIES" tone="ember" />
        <Badge88x31 title="Peer to peer" label="PEER 2 PEER" tone="teal" />
        <Badge88x31
          title="Best viewed outside"
          label="BEST VIEWED"
          sublabel="OUTSIDE"
          tone="gold"
        />
      </div>
    </div>
  {/snippet}
</SiteShell>

<!-- Mounted at the layout, not on the landing page, so it covers every entry
     point in one place: `/`, `/room/[[id]]`, `/kit` and +error.svelte all
     render through here. Gating only the landing page would be bypassed by
     deep-linking straight into a room. -->
<AgeGate />
