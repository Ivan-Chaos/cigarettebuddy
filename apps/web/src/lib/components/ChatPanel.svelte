<script lang="ts">
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

  function time(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<aside class="chat card">
  <h2 class="chat-title">Chat</h2>

  <div class="chat-list" bind:this={list}>
    {#if messages.length === 0}
      <p class="muted chat-empty">Messages go directly to your peer over WebRTC.</p>
    {/if}
    {#each messages as entry (entry.id)}
      {#if entry.kind === 'system'}
        <p class="chat-system muted">{entry.text}</p>
      {:else}
        <div class="chat-msg" class:mine={entry.mine}>
          <div class="chat-bubble">{entry.text}</div>
          <span class="chat-time muted">{time(entry.at)}</span>
        </div>
      {/if}
    {/each}
  </div>

  <form class="chat-form" onsubmit={submit}>
    <input
      bind:value={draft}
      placeholder={disabled ? 'Waiting for peer…' : 'Type a message'}
      maxlength="2000"
      {disabled}
      autocomplete="off"
    />
    <button type="submit" disabled={disabled || !draft.trim()}>Send</button>
  </form>
</aside>
