<script lang="ts">
  import '../app.css';
  import { env } from '$env/dynamic/public';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { Badge88x31, Button, NavBar, SiteShell, type NavItem } from '$lib/components/retro';
  import type { LayoutProps } from './$types';

  let { children, data }: LayoutProps = $props();

  const inRoom = $derived(page.url.pathname.startsWith('/room'));

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
          { href: '#room', label: 'the room' },
          { href: '#rules', label: 'house rules' },
        ]
      : [
          { href: resolve('/'), label: 'home' },
          { href: resolve('/room'), label: 'light up' },
        ],
  );
</script>

<svelte:head>
  <title>{env.PUBLIC_APP_NAME ?? 'cigarettebuddy'} | a smoke break with a stranger</title>
  <meta
    name="description"
    content="Video chat with one random stranger who is also outside on a break. No account, nothing saved, two people to a room."
  />
  <meta name="theme-color" content="#f2eada" />
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
        <Badge88x31 title="Made in Svelte" label="MADE IN" sublabel="SVELTE" tone="berry" />
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
