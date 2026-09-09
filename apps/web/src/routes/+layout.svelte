<script lang="ts">
  import '../app.css';
  import { env } from '$env/dynamic/public';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { Badge88x31, NavBar, SiteShell, type NavItem } from '$lib/components/retro';

  let { children } = $props();

  const inRoom = $derived(page.url.pathname.startsWith('/room'));

  // Route-aware so the in-page anchors never show up on a page that has no
  // such sections. Every link here points at something that exists.
  const nav = $derived<NavItem[]>(
    page.url.pathname === '/'
      ? [
          { href: '#what', label: 'what this is' },
          { href: '#how', label: 'how it works' },
          { href: '#room', label: 'the room' },
          { href: '#parts', label: 'the parts bin' },
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

<SiteShell wide={inRoom}>
  {#snippet header()}
    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <a href={resolve('/')} class="rt-logotype">
        cigarettebuddy<span
          class="ml-1 inline-block size-[0.3em] translate-y-[-0.05em] bg-ember align-baseline"
          aria-hidden="true"
        ></span>
      </a>
      <p class="rt-mono text-[0.8125rem] text-teal">two people, one break</p>
    </div>
    <NavBar items={nav} current={inRoom ? resolve('/room') : ''} class="mt-2.5" />
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
