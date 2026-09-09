<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Panel, TextField } from '$lib/components/retro';
  import type { ChatEntry } from '$lib/rtc/room.svelte';

  interface Props {
    messages: ChatEntry[];
    disabled: boolean;
    onSend: (text: string) => void;
  }

  let { messages, disabled, onSend }: Props = $props();

  let draft = $state('');
  let list = $state<HTMLElement | null>(null);

  $effect(() => {
    // Track length so new messages scroll into view.
    void messages.length;
    if (list) list.scrollTop = list.scrollHeight;
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

<Panel
  title="Chat"
  titleAs="h2"
  pixel
  strip="teal"
  class="flex min-h-[20rem] flex-col"
  bodyClass="flex min-h-0 flex-1 flex-col gap-3"
>
  <div bind:this={list} class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
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
