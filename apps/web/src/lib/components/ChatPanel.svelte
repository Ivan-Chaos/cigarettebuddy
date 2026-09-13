<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { Button, Panel, TextField } from '$lib/components/retro';
  import type { ChatEntry } from '$lib/rtc/room.svelte';
  import { cn } from '$lib/utils';

  interface Props {
    messages: ChatEntry[];
    disabled: boolean;
    onSend: (text: string) => void;
    class?: string;
  }

  let { messages, disabled, onSend, class: className }: Props = $props();

  let draft = $state('');
  let list = $state<HTMLElement | null>(null);

  /* Within this many pixels of the bottom counts as "reading the latest", so
     a new line pulls the view down. Scrolled up further than that, the reader
     is looking at something and gets a pill instead of a yank. */
  const NEAR_BOTTOM_PX = 48;
  // Plain `let`: read and written in handlers, never rendered.
  let stickToBottom = true;
  let unread = $state(0);

  function isNearBottom(el: HTMLElement) {
    return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
  }

  function scrollToBottom() {
    if (list) list.scrollTop = list.scrollHeight;
    unread = 0;
  }

  function onScroll() {
    if (!list) return;
    stickToBottom = isNearBottom(list);
    if (stickToBottom) unread = 0;
  }

  // Runs after the DOM has the new row, so scrollHeight is already current.
  // Your own message always lands you at the bottom: you just typed it.
  $effect(() => {
    void messages.length;
    const last = messages.at(-1);
    if (!list || !last) return;
    if (stickToBottom || last.mine) untrack(scrollToBottom);
    else untrack(() => (unread += 1));
  });

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (disabled || !draft.trim()) return;
    onSend(draft);
    draft = '';
  }

  /* Timestamps are held back until mount. `toLocaleTimeString` uses the
     runtime's own zone and locale, so a server render and the browser's first
     render disagree and the markup fails to hydrate. The room itself is
     client-only, but this panel is also used in the landing page preview,
     which is server-rendered. */
  let mounted = $state(false);
  onMount(() => (mounted = true));

  function time(iso: string) {
    if (!mounted) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<!-- No height of its own: the caller boxes it (see .rt-rail) and the list
     scrolls inside whatever it is given. -->
<Panel
  title="Chat"
  titleAs="h2"
  pixel
  strip="teal"
  class={cn('flex min-h-0 flex-col', className)}
  bodyClass="flex min-h-0 flex-1 flex-col gap-3"
>
  <div class="relative flex min-h-0 flex-1 flex-col">
    <div
      bind:this={list}
      onscroll={onScroll}
      class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1"
    >
      {#if messages.length === 0}
        <p class="my-1 text-center text-[0.8125rem] text-ink-soft">
          Nothing yet. What you type goes straight to the other person, not through us.
        </p>
      {/if}

      {#each messages as entry (entry.id)}
        {#if entry.kind === 'system'}
          <p class="rt-mono my-0.5 text-center text-xs text-ink-soft">{entry.text}</p>
        {:else}
          <div
            class="flex max-w-[85%] flex-col gap-0.5"
            class:self-end={entry.mine}
            class:items-end={entry.mine}
          >
            <div
              class="rt-raise-sm border border-ink px-2 py-1 text-sm break-words whitespace-pre-wrap"
              class:bg-putty={entry.mine}
              class:bg-panel={!entry.mine}
            >
              {entry.text}
            </div>
            <span class="rt-mono text-[0.6875rem] text-ink-soft">{time(entry.at)}</span>
          </div>
        {/if}
      {/each}
    </div>

    {#if unread > 0}
      <Button
        size="sm"
        class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-ink text-paper hover:bg-ember"
        onclick={scrollToBottom}
        aria-live="polite"
      >
        {unread} new {unread === 1 ? 'message' : 'messages'} &darr;
      </Button>
    {/if}
  </div>

  <form class="flex items-start gap-2" onsubmit={submit}>
    <TextField
      bind:value={draft}
      label="Message"
      hideLabel
      placeholder={disabled ? 'waiting for somebody to type at' : 'say something'}
      maxlength={2000}
      {disabled}
      autocomplete="off"
    />
    <Button type="submit" disabled={disabled || !draft.trim()} class="mt-px shrink-0">Send</Button>
  </form>
</Panel>
